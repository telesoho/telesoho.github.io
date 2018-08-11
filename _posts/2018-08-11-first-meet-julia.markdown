---
title: 初识Julia
tags:  [Julia,机器学习]
layout: post
description: 
comments: true
published: true
date: 2018-08-08 9:02:01 +0900
mermaid: true
mathjax: true
---

今天Julia发布了1.0版本，之前一直用python和Octave，于是试用了一下，写写感受。

[官方微博](https://julialang.org/blog/2018/08/one-point-zero-zh_cn)

0. 安装
    1. 下载安装包
    1. 解压，由于使用了symlink，所以解压时不要使用7z这种解压工具，使用tag解压即可。
    1. 只需要把julia的执行文件路径添加到系统的path即可。


1. 性能
![性能分析](https://julialang.org/images/benchmarks.svg)
由于Julia采用了JIT技术，因此Julia性能接近C，但是它却具有R、Python以及Martlab的特性。接下来看看它的特性。

2. 特性
    1. 支持数学符号和Unicode作为变量名
    比如：
    ```julia
    julia> π
    π = 3.1415926535897...
    ```
    那么如何在julia中输入π呢？只需呀在julia编辑在输入```\pi```然后按Tab，π就会自动出现了。其他的符号输入具体参考[Julia支持的数学符号](
    https://docs.julialang.org/en/v0.6.0/manual/unicode-input/)。

    2. 数学运算和数学函数
    ```julia
    julia> 2π
    6.283185307179586

    julia> √2
    1.4142135623730951

    julia> 2*√2
    2.8284271247461903

    julia> ∛3
    1.4422495703074083

    julia> e = exp(1)
    2.718281828459045

    julia> e^2
    7.3890560989306495

    julia> 2e^2
    14.778112197861299

    julia> log(e)
    1.0

    ```
    
    3. 向量定义及运算

    ```julia
    julia> A = [1 2 3; 4 5 6; 7 8 9]
    3×3 Array{Int64,2}:
    1  2  3
    4  5  6
    7  8  9

    julia> B = [1 0 1]
    1×3 Array{Int64,2}:
    1  0  1
    julia> A .* B

    3×3 Array{Int64,2}:
    1  0  3
    4  0  6
    7  0  9

    julia> C = [1;0;1]
    3-element Array{Int64,1}:
    1
    0
    1

    julia> A .* C
    3×3 Array{Int64,2}:
    1  2  3
    0  0  0
    7  8  9
    ```

    可以说，Julia对数学符号以及运算支持非常友好。

    4. 直接调用C语言函数
    编写一段c代码
    ```c
    int test() 
    {
        return(123);
    }
    ```
    编译
    ```sh
    gcc -Wall -shared -o mylib.o mylib.c
    ```
    然后在julia中调用
    ```julia
    julia>t = ccall((:test, "/home/telesoho/prjs/mnt/sandbox/julia/mylib.o"), Int32, ())
    123
    ```
    一气呵成，不需要额外的支持库。

3. 支持库

    1. 绘图
    目前Julia的绘图库Plots全部是用Julia写的，非常强大，可以参考[绘图事例](http://docs.juliaplots.org/latest/)
    1. 音频
    1. 机器学习


4. 社区

    目前中文社区才刚刚开始起步，人还非常少。虽然发布了1.0版本，但是很多支持库更新更不上，导致新版本发布的时候会莫名其妙的发生问题。

5. 未来
    由于没有大公司投入，所以都是一些爱好者或者大学研究所在用，比较容易接触到里面的大牛人。也可以感受和学习一下一门新语言是如何成长起来的。目前代码量还不大，还可以研究其核心代码，帮助自己成长。


