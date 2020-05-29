---
title: 大塚家具システム切替スケジュール
tags:  [TODO]
layout: post
description: 
comments: true
published: false
date: 2019-03-27 9:02:01 +0900
mermaid: true
mathjax: true
---
<!-- 
计划说明：

1. 主页替换

    对主页进行重新设计和实现

2. EC商城系统替换

    目前现有EC系统不能直接使用业务系统的商品情报，而且不易扩展，所以从替换现有EC系统开始着手，规范数据库中商品编号及商品信息。

3. 业务系统修改

    修改或者替换现有业务系统，以适应新的商品编号和商品信息。

```mermaid
gantt
dateFormat  YYYY-MM-DD
title IDC系统替换计划

section 原有系统调查
业务流程相关系统信息收集   :active, dc01, 2019-03-21, 1w
旧系统研究报告           :active, dc_last, after dc01, 2d

section 替换方案研究
替换系统选择及研究       :tt02, after dc_last, 7d
新旧商品编码替换方案研究  :tt03, after dc_last, 7d
替换方案提案书做成      :tt_last, after tt03, 2d

section 主页替换
主页设计/实现     : hp01, after tt_last, 2019-07-01
主页部署验收  : hp_last, after hp01, 3d

section 商城系统替换
新商城开发     : sp01, after tt_last, 120d
新商城部署     : sp02, after sp01, 7d
商品数据导入    : sp03, after sp02, 20d

section 业务系统修改
业务系统修改实施  : yw01, after sp_last 2019-03-27, 0d
``` -->

## 大塚家具システム切替スケジュール

タスク詳細説明:

1. HP切替

    既存IDCのホームページの設計が再設計と実装を行う。

2. ECシステム切替

    既存ECシステムと業務システムのDBで商品情報が一致ではないので，DBの商品番号と登録情報の新基準を作って、既存ECシステムを切替する。

3. 既存業務システム改修

    新基準商品情報を適用するため、既存業務システムの改修作業を行う

```mermaid
gantt
dateFormat  YYYY-MM-DD
title IDCシステム切替スケジュール

section 既存システム調査
業務関連システム情報収集   :active, dc01, 2019-03-21, 1w
既存システム状況調査書     :active, dc_last, after dc01, 2d

section 切替案検討
切替システム調査       :tt02, after dc_last, 7d
新・旧商品番号切替案  :tt03, after dc_last, 7d
切替案提案書作成      :tt_last, after tt03, 2d

section HP切替
HP設計と実装     : hp01, after tt_last, 2019-07-01
HPデプロイ  : hp_last, after hp01, 3d

section ECシステム切替
新EC開発     : sp01, after tt_last, 120d
新ECデプロイ     : sp02, after sp01, 7d
商品データ導入    : sp_last, after sp02, 20d

section 業務システム改修
業務システム改修（徐さん補足）: yw01, after sp_last, 0d
```

## IDC数据迁移计划

旧EC系统的商品和顾客数据迁移到新的EC系统

迁移对象：

* 现存EC系统中DB的商品数据(4000左右)
* MakeShop中的顾客数据
    1. 顾客在MakeShop登录邮箱
    1. 顾客在MakeShop中的基本信息(姓名，地址等)
    1. 顾客在MakeShop的积分(基干系统必须提沟)

由于无法获得顾客的登录密码，考虑使用如下方法：

1. 给顾客邮箱发送密码重新设定的邮件，让顾客在新系统中重新设定密码
1. 对于还未重新设定密码的顾客，在登录页面提示顾客查收密码重新设定邮件



1. 商品数据迁移
    商品数据迁移是将目前IDC旧EC系统(temucon)中的商品数据迁移到新的EC系统数据库中。
    * 由于旧商品数据的组织形式不规范，存在将商品的单个sku作为单个商品的问题，在迁移计划中不包括规范这些数据，而是依然按照原有的形式迁移到新系统中。
    * 迁移中必须要保留和原有IDC基干系统对应的商品编码形式

1. 手动顾客数据迁移(提案1)
    顾客数据迁移是指将IDC旧基干系统中的顾客信息迁移到新的EC系统中。
    * 迁移中采用并集方式迁移，即：保证旧基干系统中所有的客户的属性和字段都迁移到新系统中；保留odoo系统里旧基干系统中不存在的客户属性。
    * 旧基干系统中顾客的密码部分迁移方法（未定)
    由于无法从MakeShop中取出顾客的密码，所以只能从旧基干系统中导出顾客密码。
    * 前提条件:
        1. 必须要取得访问旧基干系统中顾客的数据库读取权利，需要和旧系统的开发公司联系
        1. 新EC系统和旧基干系统并行期间，顾客更新密码时，必须同时在两个系统中同时更新
        1. 新顾客登录时，必须在新旧系统中同时登录
    * 迁移步骤：
        1. 在新系统中实现和旧基干系统中密码的加密方法
        1. 将旧基干系统中的用户密码迁移到新系统中

1. 自动顾客数据迁移(提案2推荐)
    顾客数据迁移的后，新旧系统并行期间用户信息同步时，新旧系统都需要手动同步，所以可以考虑在旧基干系统的基础上增加API服务器，为旧基干系统开发一个顾客登录和信息读取API接口，当新EC系统中顾客登录时，调用该API接口从旧基干系统中查询用户信息，并修改用户在新系统中的状态登录系统。

![](/assets/images/2019-04-21-13-35-51.png)

名词说明:
* 新EC系统：基于odoo开发的新EC系统
* 旧EC系统：IDC的EC系统(temucon)
* 旧基干系统：IDC的旧基干系统


### 迁移方案1计划

```mermaid
gantt
dateFormat  YYYY-MM-DD
title IDC数据迁移计划

section 迁移测试环境构筑(f)
决定系统部署环境       :env_sel, after spqy_qa_src, 2d
迁移目标测试环境构筑    :env_last, after env_sel, 3d

section 商品数据迁移
旧EC系统商品数据结构库调查   :active, spqy_qa_src, 2019-04-23, 3d
商品导入数据生成工具开发    :spqy_dev_src, after spqy_qa_src, 5d
生成商品迁移数据文件   :spqy_src_data, after spqy_dev_src, 1d
新EC系统商品数据结构库调查   :active, spqy_qa_dest, 2019-04-23, 5d
商品迁移工具开发    :spqy_dev_dest, after spqy_qa_dest, 5d
商品数据迁移测试    :spqy_test, after spqy_dev_dest, 2d
商品数据迁移测试报告 :spqy_end, after spqy_test, 1d

section 顾客数据迁移（方案1)
旧基干系统顾客信息数据库结构调查   :gkqy01_qa_src,after spqy_end, 10d
顾客信息导入数据生成工具开发    :gkqy01_dev_src, after gkqy01_qa_src, 5d
生成顾客信息迁移测试数据   :gkqy01_src_data, after gkqy01_dev_src, 2d
新EC系统顾客信息数据库结构调查     :gkqy01_qa_dest, after spqy_end, 10d
顾客数据迁移工具开发    :gkqy01_dev_dest, after gkqy01_qa_dest, 5d
顾客数据迁移测试    :gkqy01_test, after gkqy01_src_data, 2d
顾客数据迁移测试报告 :gkqy01_end, after gkqy01_test, 1d

section 正式迁移
真实迁移环境构筑    :zsqy01, after gkqy01_end, 2d
正式迁移    :zsqy02, after zsqy01, 2d
联动测试    :zsqy03, after zsqy02, 2d

```

### 迁移方案２计划

```mermaid
gantt
dateFormat  YYYY-MM-DD
title IDC数据迁移计划

section 迁移测试环境构筑(f)
决定系统部署环境       :env_sel, after spqy_qa_src, 2d
迁移目标测试环境构筑    :env_last, after env_sel, 3d

section 商品数据迁移
旧EC系统商品数据结构库调查   :active, spqy_qa_src, 2019-04-23, 3d
商品导入数据生成工具开发    :spqy_dev_src, after spqy_qa_src, 5d
生成商品迁移数据文件   :spqy_src_data, after spqy_dev_src, 1d
新EC系统商品数据结构库调查   :active, spqy_qa_dest, 2019-04-23, 5d
商品迁移工具开发    :spqy_dev_dest, after spqy_qa_dest, 5d
商品数据迁移测试    :spqy_test, after spqy_dev_dest, 2d
商品数据迁移测试报告 :spqy_end, after spqy_test, 1d

section 顾客数据迁移（方案2)
旧基干系统顾客信息数据库结构调查   :gkqy02_qa_src,after spqy_end, 10d
新EC系统顾客信息数据库结构调查     :gkqy02_qa_dest, after spqy_end, 10d
API服务器构筑    :gkqy02_server_env, after gkqy02_qa_src, 2d
API服务器接口开发  :gkqy02_server_dev, after gkqy02_server_env, 2d
顾客数据迁移工具开发    :active, dc_last, after dc01, 2d
顾客数据迁移测试    :active, dc_last, after dc01, 2d

section 正式迁移
真实迁移环境构筑    :active, dc_last, after dc01, 2d
正式迁移    :active, dc_last, after dc01, 2d
联动测试    :active, dc_last, after dc01, 2d
```


既存ECシステムから新ECシステムにデータ移行について

移行対象:

* 既存ECシステムのDB商品データ(4000ぐらい)
* MakeShopで保存された顧客情報データ
    1. 顧客のメールアドレス
    1. 顧客の基本情報(姓名、住所など)
    1. 顧客ポイント（基幹システムと自動同期機能が必要）