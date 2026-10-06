// @ts-check

// ==UserScript==
// @name         YenToEuroAutoConverter
// @namespace    http://tampermonkey.net/
// @version      2025-08-27
// @description  Convert Japanese Yen and Thai Baht (THB) values to Euro
// @author       Mathieu CAROFF
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=agoda.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const currencies = [
    {
      code: "JPY",
      pattern: "¥|YEN|JPY",
      cacheKey: "yenUserscript",
      defaultRate: 0.00577,
      rate: 0,
    },
    {
      code: "THB",
      pattern: "\\u0E3F|BAHT|THB",
      cacheKey: "bahtUserscript",
      defaultRate: 0.026,
      rate: 0,
    },
  ];

  function findAndConvert() {
    for (const currency of currencies) {
      if (!currency.rate) continue;
      const currencyPattern = new RegExp(`(${currency.pattern})`, "i");
      const prefixTextPattern = new RegExp(
        `(${currency.pattern})[\\s\\u202F\\u00A0]*[^\\s\\u202F\\u00A0]`,
        "i",
      );
      const prefixValuePattern = new RegExp(
        `(${currency.pattern})[\\s\\u202F\\u00A0]*(\\d[\\d\\s,]*(\\.\\d+)?)`,
        "i",
      );
      const suffixTextPattern = new RegExp(
        `[^\\s\\u202F\\u00A0][\\s\\u202F\\u00A0]*(${currency.pattern})`,
        "i",
      );
      const suffixValuePattern = new RegExp(
        `(\\d[\\d\\s,]*(\\.\\d+)?)[\\s\\u202F\\u00A0]*(${currency.pattern})`,
        "i",
      );

      visitAllTextNodes(document.body, (textNode) => {
        if ((textNode.nodeValue ?? "").match(currencyPattern)) {
          if (textNode.parentElement?.tagName === "SCRIPT") return;
          if (markNode(textNode, currency.code)) return;
          walkSidewayAndUpUntil(textNode, {
            right: (nodeList) => {
              var text = nodeList.map((node) => node.textContent).join("");
              var textMatch = text.match(prefixTextPattern);
              var valueMatch = text.match(prefixValuePattern);
              if (valueMatch) {
                var value = Number(valueMatch[2].replace(/[\s,]/g, ""));
                var euroValue = value * currency.rate;
                var euroString = euroValue.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 2,
                });
                textNode.nodeValue = `(${euroString}) ${textNode.nodeValue}`;
              }
              return {
                found: !!valueMatch,
                keepGoing: !textMatch && !valueMatch,
              };
            },
            left: (nodeList) => {
              var text = nodeList.map((node) => node.textContent).join("");
              var textMatch = text.match(suffixTextPattern);
              var valueMatch = text.match(suffixValuePattern);
              if (valueMatch) {
                var value = Number(valueMatch[1].replace(/[\s,]/g, ""));
                var euroValue = value * currency.rate;
                var euroString = euroValue.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 2,
                });
                textNode.nodeValue = `${textNode.nodeValue} (${euroString})`;
              }
              return {
                found: !!valueMatch,
                keepGoing: !textMatch && !valueMatch,
              };
            },
          });
        }
      });
    }
  }

  /**
   * @param {Node} container
   * @param {(textNode: Text) => void} callback
   */
  function visitAllTextNodes(container, callback) {
    /** @param {Node} node */
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        callback(/** @type {Text} */ (node));
      } else {
        for (let child of node.childNodes) {
          walk(child);
        }
      }
    }
    walk(container);
  }

  /**
   * @param {Node} startNode
   * @param {{
   *   left: (nodeList: Node[]) => { found: boolean, keepGoing: boolean },
   *   right: (nodeList: Node[]) => { found: boolean, keepGoing: boolean }
   * }} callbackObject
   */
  function walkSidewayAndUpUntil(startNode, callbackObject) {
    var rightResult = callbackObject.right([startNode]);
    if (rightResult.found) return;
    var leftResult = callbackObject.left([startNode]);
    if (leftResult.found) return;
    var leftKeepGoing = leftResult.keepGoing;
    var rightKeepGoing = rightResult.keepGoing;
    var leftWait = false;
    var rightWait = false;
    var leftNodeList = [startNode];
    var rightNodeList = [startNode];

    var centralNode = startNode;

    for (var k = 0; (leftKeepGoing || rightKeepGoing) && k < 1000; k++) {
      // left
      if (leftKeepGoing && !leftWait) {
        var leftNode = leftNodeList[0];
        if (leftNode.previousSibling) {
          leftNodeList.unshift(leftNode.previousSibling);
          let { found, keepGoing } = callbackObject.left(leftNodeList);
          if (found) {
            break;
          }
          if (!keepGoing) {
            leftKeepGoing = false;
          }
        } else {
          leftWait = true;
        }
      }
      // right
      if (rightKeepGoing && !rightWait) {
        var rightNode = rightNodeList[rightNodeList.length - 1];
        if (rightNode.nextSibling) {
          rightNodeList.push(rightNode.nextSibling);
          let { found, keepGoing } = callbackObject.right(rightNodeList);
          if (found) {
            break;
          }
          if (!keepGoing) {
            rightKeepGoing = false;
          }
        } else {
          rightWait = true;
        }
      }
      // go up if both side are waiting for it
      if (leftWait && rightWait) {
        // go up
        if (centralNode.parentElement) {
          centralNode = centralNode.parentElement;
          leftWait = false;
          rightWait = false;
          leftNodeList = [centralNode];
          rightNodeList = [centralNode];
        } else {
          console.log("STOP (can't go up because no parentElement)");
          break;
        }
      }
    }
  }

  /**
   * @param {Node} node
   * @param {string} currencyCode
   */
  function markNode(node, currencyCode) {
    const attribute = `data-${currencyCode.toLowerCase()}-to-euro-converted`;
    if (node.parentElement?.getAttribute(attribute)) {
      return true;
    }
    node.parentElement?.setAttribute(attribute, "true");
    return false;
  }

  /** @param {typeof currencies[number]} currency */
  async function fetchConversionRate(currency) {
    try {
      var cachedRate = JSON.parse(
        localStorage.getItem(currency.cacheKey) || "{}",
      );
      var today = new Date().toISOString().split("T")[0];
      if (!cachedRate.rate || cachedRate.day !== today) {
        var r = await fetch(
          `https://open.exchangerate-api.com/v6/latest/${currency.code}`,
        );
        var data = await r.json();
        if (!Number.isFinite(data.rates?.EUR) || data.rates.EUR <= 0) {
          throw new Error(`Invalid ${currency.code} to EUR conversion rate`);
        }
        cachedRate.rate = data.rates.EUR;
        cachedRate.day = today;
        localStorage.setItem(currency.cacheKey, JSON.stringify(cachedRate));
      }
      currency.rate = cachedRate.rate;
    } catch (error) {
      console.log(error);
      currency.rate = currency.defaultRate;
    }
  }

  for (const currency of currencies) {
    fetchConversionRate(currency).then(findAndConvert);
  }

  document.documentElement.addEventListener("click", findAndConvert, true);

  new MutationObserver(findAndConvert).observe(document.documentElement, {
    childList: true,
    attributes: true,
    subtree: true,
  });
})();
