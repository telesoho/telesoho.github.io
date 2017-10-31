---
title:  VC++内存泄漏检测技巧
tags:  [VC, memory leak]
layout: post
description: How to detect memory leak
comments: true
categories: Visual C++
published: false
date: 2017-09-29 22:38:01 +0900
---

在Visual Studio C++环境中，有时候会报告运行的代码有内存泄漏的现象，但是却没有显示出内存泄漏的代码位置，比如：

```Txt
Detected memory leaks!

Dumping objects ->

{9554} normal block at 0x003CDCC0, 44 bytes long.
Data: < e n d > 20 C1 65 01 01 00 00 00 6E 00 00 00 9C CE 64 01

{9553} normal block at 0x003CDB58, 8 bytes long.

Data: < D e < > 44 BD 65 01 C0 DC 3C 00
{9552} normal block at 0x003CDC50, 48 bytes long.

Data: < e > A0 95 65 01 01 00 00 00 19 00 00 00 19 00 00 00

Object dump complete.
```

解决方案是，在程序开始的地方加入如下代码：

```Cpp
_CrtSetDbgFlag( _CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF );
_CrtSetBreakAlloc(9554);
_CrtSetBreakAlloc(9553);
_CrtSetBreakAlloc(9552);
```

然后在Debug模式下运行程序，VC会在分配指定内存块标记时暂停代码。

参考来源：
https://stackoverflow.com/questions/8544090/detected-memory-leaks
