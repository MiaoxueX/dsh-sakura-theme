// dsh-sakura-theme —— DSH 樱花主题插件（宿主侧）
//
// 关键背景（源自 dsh-whale-widget 的实战经验）：
//   · 桌面端（Electron）的 index.html 从安装包静态 dist 直出，宿主 renderIndex()/tapIndex 不经过它；
//     唯一生效的注入通道是 `webserver/index-inject` 推的「结构化行」，经 IPC 交给页面侧解释器逐行应用。
//   · 该注入表在宿主启动时**一次性收集**，所以注入行必须在 apply() 一开始就注册。
//   · 行类型必须用内联 `script`（textContent 追加，永不加载失败），**不能用 `script-src`**：
//     桌面端对 script-src 是「加载失败即 reject 整个 boot」，会直接把应用卡死。
//
// 本插件只做一件事：推一行内联脚本 → 在页面里注入 <style>（樱花配色/水印/花瓣动画）+ 生成花瓣元素。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSS_FILE = path.join(PACKAGE_ROOT, 'theme.css')
const SENTINEL = '__DSH_SAKURA_THEME__'

// 读主题样式（每次收集时读取，改 theme.css 后重启即生效）
function readCss() {
  try {
    return fs.readFileSync(CSS_FILE, 'utf8')
  } catch (err) {
    return ''
  }
}

// 生成内联脚本：注入样式 + 按随机参数生成花瓣（尺寸小、颜色淡，避免影响阅读）
function buildRowScript() {
  const css = readCss()
  if (!css) return ''
  return '(function(){try{'
    + 'if(window.' + SENTINEL + ')return;window.' + SENTINEL + '=1;'
    + 'var s=document.createElement("style");s.id="dsh-sakura-theme";'
    + 's.textContent=' + JSON.stringify(css) + ';'
    + 'var h=document.head||document.getElementsByTagName("head")[0]||document.documentElement;'
    + 'if(h)h.appendChild(s);'
    + 'try{'
    + 'var mm=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)");'
    + 'if(mm&&mm.matches)return;'
    + 'var b=document.body||document.documentElement;'
    + 'if(!b)return;'
    + 'for(var i=0;i<34;i++){'
    + 'var d=document.createElement("div");d.className="sakura-petal";'
    + 'var z=(5+Math.random()*6).toFixed(1);'
    + 'var du=(14+Math.random()*28).toFixed(1);'
    + 'var de=(-Math.random()*du).toFixed(1);'
    + 'var dr=(-6+Math.random()*12).toFixed(1);'
    + 'var op=(0.12+Math.random()*0.2).toFixed(2);'
    + 'var st=d.style;'
    + 'st.left=(Math.random()*100).toFixed(2)+"vw";'
    + 'st.width=z+"px";st.height=(z*1.6).toFixed(1)+"px";'
    + 'st.opacity=op;'
    + 'st.animationDuration=du+"s";st.animationDelay=de+"s";'
    + 'st.setProperty("--p-d",dr+"vw");st.setProperty("--p-o",op);'
    + 'b.appendChild(d);'
    + '}'
    + '}catch(e2){}'
    + '}catch(e){}})()'
}

export default {
  name: 'dsh-sakura-theme',
  apply(root) {
    // 尽早注册注入行（桌面端注入表在启动时一次性收集）
    const off = root.on('webserver/index-inject', (table) => {
      try {
        if (!Array.isArray(table)) return
        for (const row of table) {
          if (row && typeof row.text === 'string' && row.text.indexOf(SENTINEL) >= 0) return
        }
        const text = buildRowScript()
        if (!text) return
        table.push({ kind: 'script', placement: 'body', text })
      } catch (err) {}
    })
    root.effect(() => () => {
      try { if (typeof off === 'function') off() } catch (err) {}
    })
  },
}
