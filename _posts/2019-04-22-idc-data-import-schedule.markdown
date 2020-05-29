---
title: IDC商城数据迁移计划
tags:  [IDC, odoo, 开发]
layout: post
description: 
comments: true
published: false
date: 2019-04-22 9:02:01 +0900
mermaid: true
mathjax: true
---

## IDC数据迁移计划

旧EC系统的商品和顾客数据迁移到新的EC系统

### 一、迁移对象：

* 现存EC系统中DB的商品数据(8000左右)
    1. 商品详情及相关图片
    1. 商品属性
* MakeShop中的顾客数据
    1. 顾客在MakeShop登录邮箱
    1. 顾客在MakeShop中的基本信息(姓名，地址等)
    1. 顾客在MakeShop的积分

### 二、迁移方法

**迁移方针：**
迁移中采用并集方式迁移，即：保证旧EC系统中所有的属性和字段都迁移到新系统中；保留odoo系统里旧EC系统中不存在的属性。

1. 商品数据迁移
    商品数据迁移是将目前旧EC系统中的商品数据迁移到新的EC系统数据库中。
    * 由于旧商品数据的组织形式不规范，存在将商品的单个sku作为单个商品的问题，在迁移计划中不包括规范这些数据，而是依然按照原有的形式迁移到新系统中。
    * 迁移中必须要保留和原有IDC基干系统对应的商品编码的对应关系,旧EC系统中有旧基干系统的编码，留用即可。

1. 顾客数据迁移
    顾客数据迁移是指将MakeShop中的顾客信息迁移到新EC系统中。迁移步骤:
    1. 从MakeShop中将顾客信息（邮件地址、会员卡号）导出到CSV文件中
    1. 开发导入工具将CSV文件导入新EC系统
    1. 通过和基干系统提供给MakeShop的API将会员的积分同步到新EC系统（徐老师的意见，认为基干系统提供给MakeShop的API能直接使用）

    数据迁移完成后，通过以下步骤让顾客在新EC系统中重新设定密码：
    1. 给顾客邮箱发送密码重新设定的邮件，让顾客在新系统中重新设定密码
    1. 对于还未重新设定密码的顾客，强制顾客进入邮箱重设密码的功能

（目前：基干系统每天定时通过批处理,基于会员卡号和MakeShop帐号关联,自动将会员积分自动同步到MakeShop）

**名词说明:**
* 新EC系统：基于odoo开发的新EC系统
* 旧EC系统：IDC的EC系统
* 旧基干系统：IDC的旧基干系统

### 三、迁移计划

```mermaid
gantt
dateFormat  YYYY-MM-DD
title IDC商品数据迁移计划

section 迁移测试环境构筑
决定系统部署环境（外注）       :env_sel, after spqy_qa_src, 2d
迁移目标测试环境构筑（外注）    :env_last, after env_sel, 3d

section 商品数据迁移
旧EC系统商品数据结构库调查   :active, spqy_qa_src, 2019-04-23, 5d
商品导入数据生成工具开发（谭）    :spqy_dev_src, after spqy_qa_src, 5d
生成商品迁移数据文件   :spqy_src_data, after spqy_dev_src, 1d
新EC系统商品数据结构库调查(王)   :active, spqy_qa_dest, 2019-04-23, 10d
商品迁移工具开发（谭）    :spqy_dev_dest, after spqy_qa_dest, 5d
商品数据迁移测试    :spqy_test, after spqy_dev_dest, 2d
商品数据迁移测试报告 :spqy_end, after spqy_test, 1d

section 顾客数据迁移
旧EC系统顾客信息数据库结构调查（谭）   :gkqy01_qa_src,after spqy_end, 5d
顾客信息导入数据生成工具开发（谭）    :gkqy01_dev_src, after gkqy01_qa_src, 5d
生成顾客信息迁移测试数据（谭）   :gkqy01_src_data, after gkqy01_dev_src, 2d
新EC系统顾客信息数据库结构调查（王）     :gkqy01_qa_dest, after spqy_end, 10d
顾客数据迁移工具开发（谭）    :gkqy01_dev_dest, after gkqy01_qa_dest, 5d
顾客数据迁移测试    :gkqy01_test, after gkqy01_src_data, 2d
顾客数据迁移测试报告 :gkqy01_end, after gkqy01_test, 1d

section 正式迁移
真实迁移环境构筑    :zsqy01, after gkqy01_end, 2d
正式迁移    :zsqy02, after zsqy01, 10d

```
