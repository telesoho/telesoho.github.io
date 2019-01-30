---
title: 大数据分析
tags:  [数据分析]
layout: post
description: 
comments: false
published: false
date: 2019-01-21 9:02:01 +0900
mermaid: false
mathjax: false
---

## 大数据分析

1. Apache Spark

    Apache Spark是一个开源集群运算框架，最初是由加州大学柏克莱分校AMPLab所开发。相对于Hadoop的MapReduce会在运行完工作后将中介数据存放到磁盘中，Spark使用了存储器内运算技术，能在数据尚未写入硬盘时即在存储器内分析运算。Spark在存储器内运行程序的运算速度能做到比Hadoop MapReduce的运算速度快上100倍，即便是运行程序于硬盘时，Spark也能快上10倍速度。[1]Spark允许用户将数据加载至集群存储器，并多次对其进行查询，非常适合用于机器学习算法。

    使用Spark需要搭配集群管理员和分布式存储系统。Spark支持独立模式（本地Spark集群）、Hadoop YARN或Apache Mesos的集群管理。[3] 在分布式存储方面，Spark可以和HDFS[4]、 Cassandra[5] 、OpenStack Swift和Amazon S3等接口搭载。 Spark也支持伪分布式（pseudo-distributed）本地模式，不过通常只用于开发或测试时以本机文件系统取代分布式存储系统。在这样的情况下，Spark仅在一台机器上使用每个CPU核心运行程序。

    1. 安装
    [Spark安装(Linux)](https://medium.com/@josemarcialportilla/installing-scala-and-spark-on-ubuntu-5665ee4b62b1)
    [Spark入门教材](http://dblab.xmu.edu.cn/blog/1709-2/)


1. 阿里云大数据BI产品
    * 企业评估
        供应商 、客户、分销商评估。为企业申请、入驻提供审核，对企业供应商、客户、分销商的风险、成长指数进行量化评估，同时支持行业自定义评估方式。对招投标中的围标进行识别。在供应链围标识别中，识别并预警贷款的下游企业与上游企业5度以内关联关系。
        ![](../assets/images/2019-01-29-15-18-29.png)
    * 商机推荐
        供应商、客户、分销商、商品推荐。为企业挖掘潜在商机，根据企业客户特性及行为特征，根据行业规则，进行商品、商机推荐，通过行业、产品、投融资等静态、动态属性圈选客户群体，并对商机、客户进行ranking。 
        ![](../assets/images/2019-01-29-15-17-38.png)
    * 智慧城市
        城市、区域企业分析。为地方市场监督局、招商局、金融局、企业孵化器招商引资，扶持企业发展提供全局企业分析及企业客户推荐、同时对扶持的企业进行风险预警。
        ![](../assets/images/2019-01-29-15-19-19.png)

    * Q&A:
        1. 为什么输入的公司名称在全息画像接口中存在，但在模糊查询中却没有？
            答：目前全息画像覆盖的企业数达7000万家以上，如果模糊查询接口查询不到的公司，建议可以通过公司全称去来查得公司的全息画像。
        1. 为何我间隔一段时间后的两次查询所得的数据结果不一致？
            答：数据库里的企业信息每天都在更新，所以会出现客户查询两次结果不一致的情况，建议客户采用第二次查询（最新）的结果为准，如果两次查询的结果差异很大，可以提交工单给数据开发人员帮忙查看。
        1. 产品提供的数据质量如何？是否可作为法律依据？
            答：企业全息画像产品数据来源于各大合作机构以及阿里云自身的建模、算法能力，可为客户提供十分有价值的帮助，但不可作为法律依据。

参考:

[企业图谱](https://data.aliyun.com/product/eprofile?spm=a2c0j.7906784.landPage.2.548b62dcE81TJV)


[深入浅出统计学PDF](assets/pdf/head_first_statisties.pdf)

[知乎大数据分析回答](https://www.zhihu.com/question/22119753)

