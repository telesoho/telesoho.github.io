---
title: odoo再開発日記三
tags: [odoo, action, view, odoo再開発]
layout: post
description:
comments: true
published: false
date: 2019-05-27 19:02:01 +0900
mermaid: true
mathjax: true
---

[前回の日記二](/2019/05/23/odoo-action-and-view/)

この開発日記は自分で odoo を再開発する時に、解決が難しい問題と効率良くやり方とかを記述しております。

開発環境：
OS:ubuntu

作業フォルダ説明：

```
作業フォルダ
├── test.conf  # odoo配置ファイル
├── my_addons  # 開発モジュールの格納フォルダ
│   ├── product_sku_price  # sku価格を追加モジュール
│   │   ├── controllers
│   │   ├── demo
│   │   ├── models
│   │   ├── security
│   │   └── views
└── odoo12  # ここにodoo 12.0をインストルされました
```

### 目標：

- [ ] 既存画面の修正ルール
- [ ] モデル継承
- [ ] ビュー継承

### 既存画面の修正ルール

odoo はモデルを継承ではなく、ビューの継承も可能です。odoo で既存画面を修正したい場合は、直接に既存ソースを触らず、新モージュルて既存画面のビューを継承して修正することができます。

今回の目標は下記画面で Sale Price 項目のしたに新しい項目 Sku Price を追加します：

![](/assets/images/2019-05-27-odoo-action-and-view.markdown/2019-05-27-20-02-43.png)

まず、新しいモジュール product_sku_price を my_addons に下記のコマンドで追加します

```sh
$./odoo12/odoo-bin scaffold product_sku_price ./my_addons
```

```python
# -*- coding: utf-8 -*-
{
    # any module necessary for this one to work correctly
    'depends': ['website_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/product_views.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
}
```

上記 xml ファイルの意味は、モデル ir.actions.act_url に新しいレコード:
name フィルドが Hello url action
url フィルドがhttp://www.google.com/
taget フィルドが new
を追加する。モデル ir.actions.act_url は odoo/addons/base/models/ir_actions.py ファイルに定義されます。

```python
class IrActionsActUrl(models.Model):
    _name = 'ir.actions.act_url'
    _description = 'Action URL'
    _table = 'ir_act_url'
    _inherit = 'ir.actions.actions'
    _sequence = 'ir_actions_id_seq'
    _order = 'name'

    name = fields.Char(string='Action Name', translate=True)
    type = fields.Char(default='ir.actions.act_url')
    url = fields.Text(string='Action URL', required=True)
    target = fields.Selection([('new', 'New Window'), ('self', 'This Window')],
                              string='Action Target', default='new', required=True)
```

各フィルドの意味は下記のリックを参照してください。

<https://www.odoo.com/documentation/12.0/reference/actions.html#url-actions-ir-actions-act-url>

IrActionsActUrl クラスの\_table フィルド、値が'ir_act_url'によると、モデル'ir.actions.act_url'とテーブル'ir_act_url'の対応関係がすぐ分かります。

そして、hello モジュールの定義ファイル`__manifest__.py`の data 項目に actions.xml ファイルを追加します。

```python
    ...
    # always loaded
    'data': [
        'views/actions.xml',
    ],
    ...
```

下記のコマンドで hello モージュルを更新して odoo を起動します。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

起動成功すれば ir_act_url テーブルを確認すると追加されたアクションレコードが見えます。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-23-19-55-07.png)

### メニュー作成

次は新しいメニュー項目を作成して上記アクションを呼び出します

メニュー作成方法はアクションの作成方法大体同じ、まず、views/menu.xml ファイルを作成して、下記内容を追加します。

```xml
<odoo>
    <data>
        <menuitem name="Hello" id="hello.menu_root"  action="hello.action_hello_msg" />
    </data>
</odoo>
```

上記 xml ファイルに action が"hello.action_hello_msg"と設定されます、つまり、このメーニュをクリックすると、"hello.action_hello_msg"アクションを呼び出すことができます。

上記 xml ファイルを使用のため、hello モジュールの定義ファイル`__manifest__.py`の data 項目に menu.xml ファイルを追加します。

```python
    ...
    # always loaded
    'data': [
        'views/actions.xml',
        'views/menu.xml'
    ],
    ...
```

再度コマンドで hello モジュールを更新して起動します。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

起動成功すれば、odoo の画面を開くするとトップメニューには Hello のメニューを見えます。ただし、アクションがないメニュー項目が表示されないので注意が必要です。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-24-11-47-55.png)

Hello メニューをクリックすると、新しいページ http:://www.google.comが開けます。

### ビィー作成

odoo のビューが下記の種類があります：

- Lists
- Forms
- Graphs
- Pivots
- Kanban
- Calendar
- Gantt
- Diagram
- Dashboard
- Cohort
- Activity
- Search
- QWeb

QWeb が普通の HTML タッグも使えますから、一番理解安いと思います。では簡単の QWeb ビューから作りしましょう。

まず、template.xml を作成し、下記のコードを入力します。

```xml
<odoo>
    <data>
        <template id="hello_msg">
            <h1>Hello</h1>
        </template>
    </data>
</odoo>
```

次は定義ファイル`__manifest__.py`の data 項目に追加します。

```python
    # always loaded
    'data': [
        'views/templates.xml',
        'views/actions.xml',
        'views/menu.xml',
    ],
```

ここまで、qweb ビュー"hello_msg"の定義が完了しました。ただし、このビューにアクセスすることがまたできないので、アクセスルードの定義が必要です。

hello/controllers/controllers.py を編集して、下記のコードを入力します。

```python
# -*- coding: utf-8 -*-
from odoo import http

class Hello(http.Controller):
    @http.route('/hello/hello/', auth='public')
    def index(self, **kw):
        return http.request.render('hello.hello_msg')
```

そこまで、/hello/hello ルードを定義しました。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

上記コマンドで hello モジュールを更新して再起動します、問題なけれは、`http://localhost:8069/hello/hello/`をブラウザで開くと、下記の画面が見えます。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-24-16-13-37.png)

最後、先ほど作成した URL アクション(/views/actions.xml)を下記のように変更して、再起動すると、Hello メニューから/hello/hello に遷移することが出来るになります。

```xml
<odoo>
    <data>
        <record id="action_hello_url" model="ir.actions.act_url">
            <field name="name">Hello url action</field>
            <field name="url">/hello/hello</field>
            <field name="target">new</field>
        </record>
    </data>
</odoo>
```
