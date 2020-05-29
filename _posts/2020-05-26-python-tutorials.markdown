---
title: TODO
tags: [TODO]
layout: post
description:
comments: true
published: true
date: 2020-26-08 9:02:01 +0900
mermaid: true
mathjax: true
datacamp: true
---

- [x] [机器学习的视频](https://www.bilibili.com/video/av9912938)，每个视频写个心得博客
- [ ] 吉他谱显示网站
- [x] 阅读《影响力》一书
- [x] 本月学一首歌曲

以下是测试数学公式和图形使用功能：

$$\sqrt{\frac{n!}{k!(n-k)!}}$$完成$$a+\sqrt{(b)^3}=c^2$$

$$
A_{m,n} = \begin{pmatrix}
f(x) = \int_{-\infty}^\infty
    \hat f(\xi)\,e^{2 \pi i \xi x}
    \,d\xi
\end{pmatrix}
$$

$$x < y$$

$$
\left|\begin{array}{cc}
  a & b & a\\
  c & c & a\\
  e & f & g
\end{array}
\right|
$$

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail...
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
```

```mermaid
gantt
dateFormat  YYYY-MM-DD
title 计划

section 任务1
Completed task            :done,    des1, 2014-01-06,2014-01-08
Active task               :active,  des2, 2014-01-09, 3d
Future task               :         des3, after des2, 5d
Future task2               :         des4, after des3, 5d
```

<div data-datacamp-exercise data-lang="r">
    <code data-type="pre-exercise-code">
        # This will get executed each time the exercise gets initialized
        b = 6
    </code>
    <code data-type="sample-code">
        # Create a variable a, equal to 5
        # Print out a
    </code>
    <code data-type="solution">
        # Create a variable a, equal to 5
        a <- 5
        # Print out a
        print(a)
    </code>
    <code data-type="sct">
        test_object("a")
        test_function("print")
        success_msg("Great job!")
    </code>
    <div data-type="hint">Use the assignment operator (<code><-</code>) to create the variable <code>a</code>.</div>
</div>
