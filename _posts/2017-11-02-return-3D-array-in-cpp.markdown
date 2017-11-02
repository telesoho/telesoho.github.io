---
title: C++中如何访问多维数组
tags:  [C++, 编程技巧]
layout: post
description: 
comments: true
categories: 技术提高
published: true
date: 2017-11-02 22:15:01 +0900
---

在C/C++语言中，如果想返回一个多维数组的指针，则使用如下的方法:

```cpp
#include <iostream>

using namespace std;
typedef struct {
    int a;
    int b;
} BASE;

class Test {
    BASE* base[2][2];
    BASE base2[10];
public:
    Test() {
        base2[0].a = 1;
        base2[1].a = 2;
        base2[2].a = 3;
        base2[3].a = 4;

        base[0][0] = &base2[0];
        base[0][1] = &base2[1];
        base[1][0] = &base2[2];
        base[1][1] = &base2[3];
    }

    BASE* (&GetBase())[2][2] {
        return base;
    }

};

int main()
{
    Test t;
    BASE*  (&a)[2][2]  = t.GetBase();
    cout << a[0][0]->a << "," ;
    cout << a[0][1]->a << "," ;
    cout << a[1][0]->a << "," ;
    cout << a[1][1]->a << "," ;

    return 0;
}
```

[参考链接](https://stackoverflow.com/questions/3716595/c-returning-multidimension-array-from-function)