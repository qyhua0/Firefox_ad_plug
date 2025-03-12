document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("toggleButton");

  // 设置初始多语言文本
  document.querySelectorAll("[data-i18n]").forEach(element => {
      const messageKey = element.getAttribute("data-i18n");
      element.textContent = browser.i18n.getMessage(messageKey);
  });

  // 动态更新按钮文本（使用 Promise）
  browser.storage.sync.get("isEnabled").then(data => {
      const isEnabled = data.isEnabled !== false;
      toggleButton.textContent = browser.i18n.getMessage(isEnabled ? "toggleDisable" : "toggleEnable");
  }).catch(err => console.error("Failed to load isEnabled:", err));

  // 点击事件处理
  toggleButton.addEventListener("click", () => {
      browser.storage.sync.get("isEnabled").then(data => {

          const isEnabled = data.isEnabled !== false;
          const newState = !isEnabled;
          browser.storage.sync.set({ isEnabled: newState }).then(() => {
              toggleButton.textContent = browser.i18n.getMessage(newState ? "toggleDisable" : "toggleEnable");
              browser.runtime.sendMessage({ action: "updateRules", isEnabled: newState });
          }).catch(err => console.error("Failed to save isEnabled:", err));

          browser.runtime.reload()

      }).catch(err => console.error("Failed to get isEnabled:", err));
  });
});