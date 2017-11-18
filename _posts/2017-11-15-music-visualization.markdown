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

[Online FFT Calculate](https://sooeet.com/math/online-fft-calculator.php?cb=1)

[MatLab help about fft](http://jp.mathworks.com/help/matlab/ref/fft.html?s_tid=gn_loc_drop)

https://github.com/ybayle/awesome-deep-learning-music

https://qiita.com/eve_yk/items/07bc094538f2d50841f4

### 训练数据

收集各种乐器独奏的音乐文件，作为训练数据，以乐器名作为文件夹标签数据。

以0.25秒为取样长度，并转换为频谱，归一化后作为训练数据。

```matlab
WinLen = 0.25;
SamplingFrequence = 44100;
SamplingLen = SamplingFrequence * WinLen;
clear AudioData, SamplingFrequence;
[chord1, SamplingFrequence] = audioread("guitar/chord1.wav", [1, SamplingLen]);
[fret_3rd, SamplingFrequence] = audioread("guitar/3rd_fret.wav", [SamplingLen, SamplingLen * 2]);

SamplingPeriod = 1/SamplingFrequence;

% Time = (0:length(chord1)-1) * SamplingPeriod;

chord1FFT = fft(chord1);
fret_3rdFFT = fft(fret_3rd);

chord1FFT = (chord1FFT/SamplingLen);
chord1FFT = chord1FFT(1:SamplingLen/2+1);
chord1FFT(2:end-1) = 2*chord1FFT(2:end-1);

fret_3rdFFT = (fret_3rdFFT/SamplingLen);
fret_3rdFFT = fret_3rdFFT(1:SamplingLen/2+1);
fret_3rdFFT(2:end-1) = 2*fret_3rdFFT(2:end-1);

Frequence = (SamplingFrequence/SamplingLen)*(0:(SamplingLen/2));

figure (1);
hold on;
plot(Frequence, normalizeVector(abs(chord1FFT)));
plot(Frequence, normalizeVector(abs(fret_3rdFFT)));


title('Single-Sided Amplitude Spectrum of X(t)');
xlabel('f (Hz)');
ylabel('|P1(f)|');
```

![](/assets/images/music-visualization-plan-2017-11-18-18-13-12.png)

可以看到，即使是同一把吉他，按同一个弦的不同把位，发出的频谱都是不一样的，因此需要尽可能使用准备覆盖比较广的乐器音频作为训练数据。

[data set of Recognizing Sounds](https://medium.com/@awjuliani/hi-rajat-e0bf4b96dfeb)
