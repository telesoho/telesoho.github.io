---
title: 海宝贝商城开发计划
tags:  [海宝贝, 开发计划]
layout: post
description: 
comments: false
categories: 技术文档
published: false
mermaid: true
date: 2018-10-04 18:25:01 +0900
---

# 海宝贝商城开发计划

## 1. 软件概要

### 1.1 软件开发背景描述

公司在天猫以及京东上有CECILE、ONWARD以及千趣会等旗舰店，需要开发一个公司自营的商城（名称暂定：海宝贝商城,简称HBB），然后将CECILE、Onward等这些旗舰店上的商品放到HBB上贩卖。公司基于开源商城iWebshop的基础上，开发出了微信商城版的HBB，目前已经拓展的的功能有：
1. 实现了和公司ERP系统JMALL的商品和库存的对接
1. EMS和贝海物流单号的查询
1. 商品爬虫对接接口

目前，微信商城不能满足运营上的需要，需要在此基础开发HBB微信小程序。

### 1.2 软件设计约束

* 开发环境：
    * HBB微信商城：PHP 5.6, Linux, MySql, Git, vue
    * HBB微信小程序：PHP 7, Linux, Mysql, Laravel, 微信小程序开发工具

## 2. 开发计划

### 2.1 整体计划

```mermaid
gantt
dateFormat  YYYY-MM-DD
title 海宝贝商城开发计划

section 总体计划
需求整理阶段        :active, needs, 2018-10-04,5d
UI设计             :design, after needs, 5d
开发                :dev, after design, 30d
发布测试             :publish, after dev, 10d
```

## 2.2 人员需求

* 产品经理（租用形式）
    在需求整理阶段参与规划HBB商城的产品定位以及功能设计，输出产品框图。
* 美工设计（租用或者外包）
    根据产品框图设计出产品整体页面效果。
* 前端（租用或者外包）
    开发微信小程序，以及维护微信商城页面
* 后端（聘用）
    基于laravel开发微信小程序后台API,微信商城后台以及搭建服务器
