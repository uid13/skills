# ImageMagick 命令参考

> 本文件收录 imagegen-magick 技能常用 IM 命令速查。

## ⚙️ render.mjs 内部执行的命令

本技能的 `render.mjs` 封装了以下核心命令：

```bash
magick <input.svg> \
  -background <bg> \
  -density <dpi> \
  -quality <1-100> \
  <output.png>
```

### 参数详解

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-background none` | 透明背景 | transparent |
| `-background white` | 白色背景 | - |
| `-background #FF5522` | 指定颜色 | - |
| `-density 96` | DPI (默认，1x) | 96 |
| `-density 192` | 2x 分辨率 | - |
| `-density 288` | 3x 分辨率 | - |
| `-quality 95` | PNG 质量（压缩率，不影响清晰度） | 95 |
| `-quality 60` | 较低压缩（减小文件体积） | - |

## 🎨 常见渲染场景

### 1. 高清 PNG（2x 分辨率）

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --scale 2x
```

等价 IM 命令：
```bash
magick input.svg -background none -density 192 -quality 95 output.png
```

### 2. 白色背景（不透明）

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --background white
```

### 3. 指定颜色背景

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --background "#F5F5DC"
```

### 4. 强制覆盖已有输出

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --force
```

### 5. 低质量（减小文件）

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --quality 60
```

## 🔄 后处理命令（可选）

### 1. 压缩 PNG 文件大小

```bash
# 使用 optipng（额外软件，非 ImageMagick）
optipng -o7 output.png

# 或用 pngquant（有损压缩）
pngquant --quality=65-80 --output output-small.png output.png
```

### 2. 调整为特定宽度（保持比例）

```bash
magick output.png -resize 900x output-resize.png
```

### 3. 裁剪到正方形（居中）

```bash
magick output.png -gravity center -crop 1:1 +repage output-square.png
```

### 4. 转换为 JPEG（较小文件，非透明）

```bash
magick output.png -background white -flatten -quality 85 output.jpg
```

### 5. 转换为 WebP（现代格式，更小）

```bash
magick output.png -quality 85 output.webp
```

### 6. 添加水印

```bash
# 图片水印
magick output.png watermark.png -gravity southeast -geometry +20+20 -composite output-wm.png

# 文字水印
magick output.png \
  -gravity southeast \
  -pointsize 24 \
  -fill "rgba(255,255,255,0.5)" \
  -annotate +20+20 "© uid13" \
  output-wm.png
```

### 7. 添加圆角

```bash
# 用 mask 实现圆角
magick output.png \
  \( +clone -alpha extract -draw "fill black polygon 0,0 0,50 50,0 fill white circle 50,50 50,0" \
     \( +clone -flip \) -compose Multiply -composite \
     \( +clone -flop \) -compose Multiply -composite \
  \) -alpha off -compose CopyOpacity -composite output-rounded.png
```

### 8. 批量渲染（多张 SVG → PNG）

```bash
# Shell 写法
for svg in *.svg; do
  png="${svg%.svg}.png"
  magick "$svg" -background none -density 192 -quality 95 "$png"
done

# PowerShell 写法
Get-ChildItem *.svg | ForEach-Object {
  $png = "$($_.BaseName).png"
  magick $_.FullName -background none -density 192 -quality 95 $png
}
```

## 🔍 信息查询命令

### 1. 检查 ImageMagick 版本

```bash
magick -version
```

### 2. 列出支持的格式

```bash
magick identify -list format
```

### 3. 列出系统字体

```bash
magick identify -list font
```

### 4. 获取图像信息

```bash
magick identify image.png
# 输出：image.png PNG 900x383 900x383+0+0 8-bit sRGB 42.5KB 0.000u 0:00.000
```

### 5. 获取详细元数据

```bash
magick identify -verbose image.png | head -50
```

## 🎨 高级效果（可选）

### 1. 添加模糊（毛玻璃）

```bash
magick output.png -blur 0x8 output-blur.png
```

### 2. 色彩调整

```bash
# 增加亮度
magick output.png -brightness-contrast 10x0 output-bright.png

# 调整饱和度
magick output.png -modulate 100,150,100 output-vivid.png

# 灰色调
magick output.png -colorspace Gray output-gray.png
```

### 3. 旋转图像

```bash
# 顺时针 90 度
magick output.png -rotate 90 output-rot90.png

# 任意角度
magick output.png -rotate 15 -background none output-rot15.png
```

### 4. 拼接多张图

```bash
# 水平拼接
magick a.png b.png c.png +append h-stitched.png

# 垂直拼接
magick a.png b.png c.png -append v-stitched.png

# 网格拼接（2x2）
magick montage a.png b.png c.png d.png \
  -tile 2x2 -geometry +10+10 -background white grid.png
```

## 📏 尺寸转换

```bash
# 缩放到固定宽度（保持比例）
magick output.png -resize 800x output-800w.png

# 缩放到固定高度
magick output.png -resize x600 output-600h.png

# 缩放到固定框内（不超）
magick output.png -resize 800x600 output-boxed.png

# 强制拉伸（不保比例）
magick output.png -resize 800x600! output-stretch.png

# 缩放到固定区域面积
magick output.png -resize 100000@ output-100kpx.png
```

## 🔄 输出格式转换

```bash
# PNG → JPEG
magick input.png -background white -flatten input.jpg

# PNG → WebP
magick input.png -quality 85 input.webp

# PNG → GIF
magick input.png input.gif

# SVG → 多种格式（一次性）
magick input.svg \
  -background none -density 192 -quality 95 input.png \
  -background white -flatten -quality 85 input.jpg \
  -quality 85 input.webp
```

## 🛠️ 调试技巧

### 1. 显示执行的真实命令

```bash
node <skill-dir>/scripts/dist/render.mjs input.svg -o output.png --debug
```

### 2. 查看详细错误信息

```bash
magick input.svg output.png 2>&1 | tee error.log
```

### 3. 验证 SVG 是否合法

```bash
magick identify -verbose input.svg | grep -E "(geometry|error)"
```

### 4. 测试渲染小尺寸（快速预览）

```bash
# 密度用 48（0.5x），渲染很快
magick input.svg -background none -density 48 preview.png
```

## ❓ 常见问题

### Q: 渲染后 SVG 中的字体不生效？

A: 检查字体是否在系统中安装，参考 `check-fonts.mjs --filter "字体名"`。
SVG 中应使用字体链式 fallback：
```xml
<text font-family="'Cascadia Code', 'Microsoft YaHei', sans-serif">
```

### Q: 渲染的 PNG 体积过大？

A: 依次尝试：
1. `--quality 80`（默认 95）
2. `--scale 1x`（默认 2x）
3. 用 `pngquant` 进一步压缩：`pngquant --quality=65-80 input.png`

### Q: 透明背景的 PNG 在某些软件中显示为黑色？

A: 部分旧版图片查看器对 PNG alpha 通道支持不完整。解决：
- 用白色背景渲染：`--background white`
- 或用现代看图软件（Windows Photos / IrfanView / XnView）

## 📚 参考资源

- ImageMagick 官方文档：https://imagemagick.org/script/index.php
- IM 7 命令行工具：https://imagemagick.org/script/command-line-tools.php
- PNG 优化指南：https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
