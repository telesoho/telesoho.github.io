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

### 功能

天灵硕火功能构思

1. 自动和弦识别
    * 用户上传MP3的文件，或者使用麦克风录制一段歌曲
    * 服务器识别出歌曲的和弦
    * 显示识别的和弦，并允许用户播放已上传的语音
1. 音乐可视化效果
    * 精灵舞台

        精灵舞台是一个2维的空间，纵坐标表示振幅，即音量高低，横坐标表示时间流动，流动方向是从右到左，用于表现音乐速度。选择从右到左是因为如果用右手指挥的话，可以保证精灵跃起方向和指挥棒划动方向一致，能给人一直用指挥棒指挥精灵跳舞的感觉。

    * 舞蹈精灵

        识别出乐曲中不同的乐器，然后用不同的精灵表示不同的乐器，比如：大鼓用一片火海表示，蓝色精灵表示钢琴，黄色精灵表示吉他等等。

        根据乐器演奏的音量计算出精灵向右上跃起的高度，然后精灵由于向下重力和时间向左移动的影响，会产生减速下落和拉长精灵轨迹的效果。

### 相关论文

1. [DEEP CONVOLUTIONAL NETWORKS ON THE PITCH SPIRAL FOR MUSICAL INSTRUMENT RECOGNITION](/assets/pdf/lostanlen_ismir2016.pdf)
    [代码](https://github.com/lostanlen/ismir2016)
1. [Event Localization in Music Auto-tagging](http://mac.citi.sinica.edu.tw/~yang/pub/liu16mm.pdf)
    [代码](https://github.com/ciaua/clip2frame)
    人声的识别比较准确，但是乐器识别有不少的问题。使用[youtube API](https://developers.google.com/youtube/v3/getting-started)读取youtube视频并解析，这个值得研究一下。他们还做了[演示网站](http://clip2frame.ciaua.com/)
1. [A FULLY CONVOLUTIONAL DEEP AUDITORY MODEL FOR MUSICAL CHORD RECOGNITION](http://www.cp.jku.at/research/papers/Korzeniowski_MLSP_2016.pdf)
    [相关代码](https://github.com/fdlm/chordrec)
    一个识别和弦的论文，可以用于实现天灵硕火实现和弦识别的功能。

### 相关工具

1. [madmom](https://github.com/CPJKU/madmom)
    一个用python实现的声乐信号处理库。


### 实现模型


[梅爾倒頻譜(Mel-Frequency Spectrum)](https://zh.wikipedia.org/wiki/%E6%A2%85%E7%88%BE%E5%80%92%E9%A0%BB%E8%AD%9C)

时序频谱

```matlab
% Guitar spectrogram
[x, Fs] = audioread('instruments/guitar/3rd_fret.wav', [1, 44100*6]); % audio file
x = x(:, 1);
step = fix(5*Fs/1000);     % one spectral slice every 5 ms
window = fix(250*Fs/1000);  %40 ms data window
fftn = 2^nextpow2(window); % next highest power of 2
[S, f, t] = specgram(x, fftn, Fs, window, window-step);
S = abs(S(2:fftn*4000/Fs,:)); % magnitude in range 0<f<=4000 Hz.
S = S/max(S(:));           %normalize magnitude so that max is 0 dB.
S = max(S, 10^(-40/10));   % clip below -40 dB.
S = min(S, 10^(-3/10));    % clip above -3 dB.
imagesc (t, f, log(S));    % display in log scale
set (gca, 'ydir', 'normal'); % put the 'y' direction in the correct direction
ylabel 'Frequence (Hz)';
xlabel 'Time (s)';
```

运行结果：

![](/assets/images/STFT-guitar-2017-11-19-18-39-55.png)


相关资料：

[Pythonで音声信号処理](http://aidiary.hatenablog.com/entry/20110514/1305377659)

[類似楽曲検索システムを作ろう](http://aidiary.hatenablog.com/entry/20121014/1350211413)

[Deep Learning源代码收集](http://blog.csdn.net/zouxy09/article/details/11910527)

[STFT和声谱图，梅尔频谱（Mel Bank Features）与梅尔倒谱（MFCCs）](http://blog.csdn.net/qq_28006327/article/details/59129110)

[Deep convolutional neural networks for predominant instrument recognition in polyphonic music](https://arxiv.org/pdf/1605.09507.pdf)

[Recognizing Sounds (A Deep Learning Case Study)](https://medium.com/@awjuliani/recognizing-sounds-a-deep-learning-case-study-1bc37444d44d)

You can download data set from here [data set of Recognizing Sounds](https://medium.com/@awjuliani/hi-rajat-e0bf4b96dfeb).

[How to set Window size vs data length for FFT](https://stackoverflow.com/questions/5570355/window-size-vs-data-length-for-fft)

[Online FFT Calculate](https://sooeet.com/math/online-fft-calculator.php?cb=1)

[MatLab help about fft](http://jp.mathworks.com/help/matlab/ref/fft.html?s_tid=gn_loc_drop)

https://github.com/ybayle/awesome-deep-learning-music

https://qiita.com/eve_yk/items/07bc094538f2d50841f4

### 训练数据

收集各种乐器独奏的音乐文件，作为训练数据，以乐器名作为文件夹标签数据。

以0.25秒为取样长度，并转换为幅度频谱，归一化后作为训练数据。

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
