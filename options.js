document.addEventListener("DOMContentLoaded", () => {
  // 获取所有必要的DOM元素
  const adList = document.getElementById("adList");
  const saveButton = document.getElementById("saveButton");
  const exportButton = document.getElementById("exportButton");
  const importButton = document.getElementById("importButton");
  const importFile = document.getElementById("importFile");
  const toggleButton = document.getElementById("toggleButton");
  const sidebarItems = document.querySelectorAll(".sidebar li");
  const contentSections = document.querySelectorAll(".content section");

  // 检查元素是否正确获取
  if (!adList || !saveButton || !exportButton || !importButton || !importFile || !toggleButton) {
      console.error("One or more elements are missing:", {
          adList, saveButton, exportButton, importButton, importFile, toggleButton
      });
      return;
  }

  // 设置多语言文本
  document.querySelectorAll("[data-i18n]").forEach(element => {
      const messageKey = element.getAttribute("data-i18n");
      if (messageKey) {
          element.textContent = browser.i18n.getMessage(messageKey);
      } else {
          console.warn("Missing data-i18n attribute on element:", element);
      }
  });
  const placeholderKey = adList.getAttribute("data-i18n-placeholder");
  if (placeholderKey) {
      adList.placeholder = browser.i18n.getMessage(placeholderKey);
  } else {
      adList.placeholder = "Enter domains to block, one per line (e.g., ad1.com)";
  }

  // 加载开关状态（使用 Promise）
  browser.storage.sync.get("isEnabled").then(data => {
      const isEnabled = data.isEnabled !== false;
      toggleButton.textContent = browser.i18n.getMessage(isEnabled ? "toggleDisable" : "toggleEnable");
  }).catch(err => console.error("Failed to load isEnabled:", err));

  // 加载广告列表
  browser.storage.sync.get("customAdList").then(data => {
      let rawList = data.customAdList || [];
      adList.value = rawList.map(url => {
          if (url.startsWith("@@||") && url.endsWith("^")) {
              return url.replace("@@||", "@@").replace("^", "");
          } else if (url.startsWith("/") && url.endsWith("/")) {
              return url;
          } else if (url.startsWith("||") && url.endsWith("^")) {
              return url.replace("||", "").replace("^", "");
          }
          return url;
      }).join("\n");
  }).catch(err => console.error("Failed to load customAdList:", err));

  // 切换菜单
  sidebarItems.forEach(item => {
      item.addEventListener("click", () => {
          sidebarItems.forEach(i => i.classList.remove("active"));
          item.classList.add("active");
          contentSections.forEach(section => section.classList.remove("active"));
          const targetSection = document.getElementById(item.getAttribute("data-section"));
          if (targetSection) {
              targetSection.classList.add("active");
          }
      });
  });

  // 开关按钮逻辑
  toggleButton.addEventListener("click", () => {
      browser.storage.sync.get("isEnabled").then(data => {
          const isEnabled = data.isEnabled !== false;
          const newState = !isEnabled;
          browser.storage.sync.set({ isEnabled: newState }).then(() => {
              toggleButton.textContent = browser.i18n.getMessage(newState ? "toggleDisable" : "toggleEnable");
              browser.runtime.sendMessage({ action: "updateRules", isEnabled: newState });
          }).catch(err => console.error("Failed to save isEnabled:", err));
      }).catch(err => console.error("Failed to get isEnabled:", err));
  });

  // 保存广告列表
  saveButton.addEventListener("click", () => {
      const rawList = adList.value.split("\n").filter(line => line.trim() !== "");
      const formattedList = rawList.map(domain => {
          if (domain.startsWith("@@")) return `@@||${domain.slice(2)}^`;
          if (domain.startsWith("/") && domain.endsWith("/")) return domain;
          return `||${domain.trim()}^`;
      });
      browser.storage.sync.set({ customAdList: formattedList }).then(() => {
          browser.runtime.sendMessage({ action: "updateRules", isEnabled: true });
          alert("Saved!");
      }).catch(err => console.error("Failed to save customAdList:", err));
  });

  // 导出规则
  exportButton.addEventListener("click", () => {
      const rawList = adList.value.split("\n").filter(line => line.trim() !== "");
      const blob = new Blob([rawList.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      browser.downloads.download({
          url: url,
          filename: "ad_block_list.txt",
          saveAs: true
      }).then(() => {
          console.log("Export completed.");
      }).catch(err => console.error("Export failed:", err));
  });

  // 导入规则
  importButton.addEventListener("click", () => {
      importFile.click();
  });
  importFile.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              adList.value = e.target.result;
              const rawList = adList.value.split("\n").filter(line => line.trim() !== "");
              const formattedList = rawList.map(domain => {
                  if (domain.startsWith("@@")) return `@@||${domain.slice(2)}^`;
                  if (domain.startsWith("/") && domain.endsWith("/")) return domain;
                  return `||${domain.trim()}^`;
              });
              browser.storage.sync.set({ customAdList: formattedList }).then(() => {
                  browser.runtime.sendMessage({ action: "updateRules", isEnabled: true });
                  alert("Imported!");
              }).catch(err => console.error("Failed to import customAdList:", err));
          };
          reader.readAsText(file);
      }
  });
});