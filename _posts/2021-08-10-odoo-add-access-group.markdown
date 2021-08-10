---
title: 增加odoo权限
tags: [odoo]
layout: post
description:
comments: true
published: true
date: 2021-08-10 20:17:01 +0900
mermaid: false
mathjax: false
datacamp: false
---

人生最幸运的两个时刻，一个是出生的时刻，一个就是找到人生目标的时刻，如果还没找到人生目标，那就每天设定一个目标，然后完成它。今天的目标就是搞明白odoo的权限显示。

先看看，权限管理页面：

![](/assets/images/2021-08-10-odoo-add-access-group.markdown/2021-08-10-20-36-38.png)

可以看到odoo权限页面有三种方式显示权限：

* 单选框：如 User Type
* 下拉框：如 Access Person
* 复选框：如 Door Access和Device Access

当我们想新增加自己的权限的时候，应该怎么增加呢？odoo在这里挖了一个很大的坑，权限管理页面并没有按照传统的方式去实现，而是动态生成的。就是页面上所有的权限项目都是直接从res.groups和ir.module.category范例(model)里读取出来，然后生成动态的字段名，比如:sel_groups_59_60

![](/assets/images/2021-08-10-odoo-add-access-group.markdown/2021-08-10-20-53-00.png)

因此，如果我们想增加新的权限，只需要在res.groups里追加记录就可以了。例如：

```xml
<?xml version="1.0" encoding="utf-8" ?>
<odoo>
    <data>
        <record id="module_category_remotelock" model="ir.module.category">
            <field name="name">Remotelock</field>
            <field name="sequence">18</field>
        </record>
        <record id="category_remotelock_access_person" model="ir.module.category">
            <field name="name">Access Person</field>
            <field name="sequence">19</field>
            <field name="parent_id" ref="module_category_remotelock" />
        </record>
        <record id="category_remotelock_access" model="ir.module.category">
            <field name="name">Remotelock Access</field>
            <field name="sequence">20</field>
            <field name="parent_id" ref="module_category_remotelock" />
        </record>
        <record id="group_remotelock_door_access" model="res.groups">
            <field name="name">Door Access</field>
            <field name="category_id" ref="category_remotelock_access" />
            <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
        </record>
        <record id="group_remotelock_device_access" model="res.groups">
            <field name="name">Device Access</field>
            <field name="category_id" ref="category_remotelock_access" />
            <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
        </record>
        <record id="group_remotelock_access_guest" model="res.groups">
            <field name="name">Remotelock Access Guest</field>
            <field name="category_id" ref="category_remotelock_access_person" />
            <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
        </record>
        <record id="group_remotelock_access_user" model="res.groups">
            <field name="name">Remotelock Access User</field>
            <field name="category_id" ref="category_remotelock_access_person" />
            <field name="implied_ids" eval="[(4, ref('group_remotelock_access_guest'))]"/>
        </record>
    </data>
</odoo>
```

这里我们定义了三个权限组Remotelock, Access Person和Remotelock Access，它们的关系是：

- Remotelock
    - Access Person
    - Remotelock Access

Access Person有两个权限：Remotelock Access Guest和Remotelock Access User，它们是单选关系，只能选其中一个，因此我们需要把它显示为下拉框。那么这个例子中，odoo是怎么判断这两个权限需要用下拉框显示呢？先看看odoo的代码：

```python
    @api.model
    def get_groups_by_application(self):
        # ...
        def linearize(app, gs, category_name):
            # 'User Type' is an exception
            if app.xml_id == 'base.module_category_user_type':
                return (app, 'selection', gs.sorted('id'), category_name)
            # determine sequence order: a group appears after its implied groups
            order = {g: len(g.trans_implied_ids & gs) for g in gs}
            # We want a selection for Accounting too. Auditor and Invoice are both
            # children of Accountant, but the two of them make a full accountant
            # so it makes no sense to have checkboxes.
            if app.xml_id == 'base.module_category_accounting_accounting':
                return (app, 'selection', gs.sorted(key=order.get), category_name)
            # check whether order is total, i.e., sequence orders are distinct
            if len(set(order.values())) == len(gs):
                return (app, 'selection', gs.sorted(key=order.get), category_name)
            else:
                return (app, 'boolean', gs, (100, 'Other'))


        # ...
```

代码中能看到有属于类(base.module_category_user_type和base.module_category_accounting_accounting)的权限都是selection权限，即单选权限。此外，有两个条件：

1. 必须属于同一个类。
    比如：Remotelock Access Person和Remotelock Access User都是Access Person类
1. implied_ids中定义权限个数必须不一样。
    这里Remotelock Access Guest的implied_ids是'base.group_user'，而Remotelock Access User的implied_ids是group_remotelock_access_guest，即：包含了base.group_user和Remotelock Access Guest权限，数量上要多1。

不满足Selection条件的都是属于(boolean)复选权限，比如这里的Remotelock Access的两个权限：Door Access和Device Access。

那么User type的单选框是怎么显示的呢？它是被写死的，而且只有User Type类型(category_id = base.module_category_user_type)会被显示为单选框。

## 总结

设计最怕出乎意料，odoo的权限管理页面，为了维护上的简单，采取了这种莫名其妙的设计，而且还没有文档详细的说明，需要靠查代码才能搞清楚的，实在是糟糕透顶。而且这还带来一个问题，如果现在model的create()或write()函数中判断，用户选择了什么权限，非常困难。



