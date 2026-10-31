# www.telesoho.com

个人主页（静态站点，无构建步骤）。版式按 `telesoho_studio_workshop.svg` 设计稿（暖纸张 + 森林绿）：主视觉工作台、工作台上的作品、实验台、关于工坊。顶栏「工程笔记 ↗」切换到工程模式（深绿底），用公式与两个轻量实验说明实现边界，「回到工坊」返回。

插画均为从设计稿拆出的独立 SVG，位于 `assets/`（`hero-workbench.svg`、`card-*.svg`、`lab-*.svg`、`about-landscape.svg`、`mark.svg`、纸纹理 `paper-grain.svg` / `dark-grain.svg`）。

博客在独立仓库 [`telesoho.github.io`](https://github.com/telesoho/telesoho.github.io)，域名 `blog.telesoho.com`。

## 本地预览

用任意静态服务器打开仓库根目录，例如：

```bash
npx --yes serve .
```

工程模式：打开页面后点顶栏「工程笔记 ↗」，或访问 `#engineering`。（脚本是 ES module，需通过 http 打开，直接双击 file:// 不会运行 JS。）

## GitHub Pages

1. 推送到 GitHub 用户 `telesoho` 的公开仓库
2. Settings → Pages：Source 选 `main`，目录 `/`
3. Custom domain：`www.telesoho.com`（仓库内已有 `CNAME`）
4. DNS：`www` CNAME → `telesoho.github.io`；顶点域名四条 A 记录指向 GitHub Pages IP；勿改动 `blog` 记录
5. 证书就绪后打开 Enforce HTTPS
