// 默认广告规则
const defaultAdList = [
  "||kwcscdn.000dn.com^",
  "||kwflvcdn.000dn.com^",
  "||0013.cc^",
  "||s8.001fzc.com^",
  "||yn.001fzc.com^",
  "||001union.com^",
  "||04424170.xyz^",
  "||044da016b3.com^",
  "||q.0451106.com^",
  "||04c8b396bf.com^",
  "||04e0d8fb0f.com^",
  "||04o.fun^",
  "||awklir.0506mall.com^",
  "||0511code.com^",
  "||0512pifa.com.cn^",
  "||0512s.com^",
  "||s.051352.com^",
  "||nxw.0518g.com^",
  "||api.0530hz.cn^",
  "||e.0531mnk.net^",
  "||m.0531mnk.net^",
  "||lkbf.0532ci.com.cn^",
  "||05420795.xyz^"
];

// 将规则转换为正则表达式模式
function createUrlPatterns(adList) {
  return adList.map(url => {
      const isException = url.startsWith("@@");
      const cleanUrl = isException ? url.slice(2) : url;

      let pattern;
      if (cleanUrl.startsWith("||")) {
          // 处理 || 开头的规则，表示域名及其子域名
          pattern = cleanUrl.slice(2); // 去掉 ||
          // 移除结尾的 ^（uBlock Origin 中表示分隔符，不需要特殊处理）
          if (pattern.endsWith("^")) {
              pattern = pattern.slice(0, -1);
          }
          // 生成正则：匹配协议 + 可选子域名 + 主域名 + 任意路径
          pattern = `https?:\\/\\/([^\\/]+\\.)*${pattern.replace(/\./g, "\\.")}(\\/|$)`;
      } else {
          // 处理普通规则，匹配完整路径
          pattern = cleanUrl.replace(/\./g, "\\.").replace(/\*/g, ".*");
          if (!pattern.startsWith("http")) {
              pattern = `https?:\\/\\/${pattern}`;
          }
          // 确保路径匹配
          pattern += "(\\/|$)";
      }

      const regex = new RegExp(pattern);
      console.log(`Generated regex for "${url}": ${regex.source}`);

      return {
          pattern: regex,
          isException
      };
  });
}

// 更新拦截规则
function updateRules(isEnabled, customAdList = []) {
  if (browser.webRequest.onBeforeRequest.hasListener(blockRequest)) {
      browser.webRequest.onBeforeRequest.removeListener(blockRequest);
  }

  if (!isEnabled) {
      console.log("Ad blocking disabled.");
      return;
  }else{
    console.log("Ad blocking enabled.");
  }

  const allRules = [...defaultAdList, ...customAdList];
  const urlPatterns = createUrlPatterns(allRules);

  function blockRequest(details) {
      const url = details.url;
      console.log(`Checking request: ${url}`); // 调试输出

      for (const rule of urlPatterns) {
          if (rule.pattern.test(url)) {
              if (rule.isException) {
                  console.log(`Allowed (exception): ${url}`);
                  return { cancel: false };
              }
              console.log(`Blocked: ${url}`);
              return { cancel: true };
          }
      }
      console.log(`Default Allowed: ${url}`);
      return { cancel: false }; // 默认允许通过
  }

  // 只拦截特定资源类型，避免拦截主页面
  browser.webRequest.onBeforeRequest.addListener(
      blockRequest,
      // { urls: ["<all_urls>"], types: ["script", "image", "stylesheet"] }, // 移除 main_frame 和 sub_frame
      { urls: ["<all_urls>"] }, // 移除 types 限制，监听所有请求
      ["blocking"]
  );
  console.log("Ad blocking enabled with rules:", allRules);
}

// 插件安装时设置默认数据
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
      browser.storage.sync.set({
          customAdList: defaultAdList,
          isEnabled: true
      }, () => {
          updateRules(true, defaultAdList);
      });
  } else if (details.reason === "update") {
      browser.storage.sync.get(["isEnabled", "customAdList"], (data) => {
          updateRules(data.isEnabled !== false, data.customAdList || defaultAdList);
      });
  }
});

// 监听消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateRules") {
      browser.storage.sync.get("customAdList", (data) => {
          const customAdList = data.customAdList || [];
          updateRules(message.isEnabled, customAdList);
          sendResponse({ success: true });
      });
      return true; // 表示异步响应
  }
});

// 初始化时加载状态
browser.storage.sync.get(["isEnabled", "customAdList"], (data) => {
  const isEnabled = data.isEnabled !== false;
  const customAdList = data.customAdList || defaultAdList;
  updateRules(isEnabled, customAdList);
});