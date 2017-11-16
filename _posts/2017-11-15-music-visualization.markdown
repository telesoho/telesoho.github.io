---
title: 天灵硕火实现计划
tags:  [音乐, 可视化]
layout: post
description: 
comments: true
categories: 产品设计
published: true
mermaid: true
date: 2017-11-15 20:40:01 +0900
---

## 总体计划

```mermaid
gantt
dateFormat  YYYY-MM-DD
title 天灵硕火实现计划

section 总体计划
准备阶段            :active,    prepare, 2017-11-15,30d
原型制作            :demo, after prepare, 30d
优化提升            :optimization, after demo, 30d
发布               : publish, after optimization, 30d

section 准备阶段
模型            :active, collect, 2017-11-15, 10d
音频数据收集            :active, sample, 2017-11-15, 30d
实验代码                : test, after collect, 20d
```

## 准备阶段

### 实现模型

相关资料：

[Recognizing Sounds (A Deep Learning Case Study)](https://medium.com/@awjuliani/recognizing-sounds-a-deep-learning-case-study-1bc37444d44d)

You can download data set from here [data set of Recognizing Sounds](https://medium.com/@awjuliani/hi-rajat-e0bf4b96dfeb).

[How to set Window size vs data length for FFT](https://stackoverflow.com/questions/5570355/window-size-vs-data-length-for-fft)

[Online FFT Caculate](https://sooeet.com/math/online-fft-calculator.php?cb=1)

[matlab help about fft](http://jp.mathworks.com/help/matlab/ref/fft.html?s_tid=gn_loc_drop)

https://github.com/ybayle/awesome-deep-learning-music


https://qiita.com/eve_yk/items/07bc094538f2d50841f4

### 训练数据

[data set of Recognizing Sounds](https://medium.com/@awjuliani/hi-rajat-e0bf4b96dfeb).
