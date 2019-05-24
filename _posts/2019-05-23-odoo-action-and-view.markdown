---
title: odoo再開発日記二
tags:  [odoo, action, view, odoo再開発]
layout: post
description: 
comments: true
published: true
date: 2019-05-23 9:02:01 +0900
mermaid: true
mathjax: true
---

[前回の日記一](/2019/05/22/odoo-model/)

この開発日記は自分でodooを再開発する時に、解決が難しい問題と効率良くやり方とかを記述しております。

開発環境：
OS:ubuntu

作業フォルダ説明：

```
作業フォルダ
├── test.conf  # odoo配置ファイル
├── my_addons  # 開発モジュールの格納フォルダ
├── my_addons
│   ├── hello  # 前回作成したモジュール
│   │   ├── controllers
│   │   ├── demo
│   │   ├── models
│   │   ├── security
│   │   └── views
└── odoo12  # ここにodoo 12.0をインストルされました
```


### 目標：

- [x] アクション作成
- [x] メニュー作成
- [x] ビィー作成

### アクション作成

参考資料：[odooのアクション](https://www.odoo.com/documentation/12.0/reference/actions.html)

上記資料にodooのアクションが５つあります：

* Window Actions (ir.actions.act_window)
* URL Actions (ir.actions.act_url)
* Server Actions (ir.actions.server)
* Report Actions (ir.actions.report)
* Client Actions (ir.actions.client)

この５つアクションが対応テーブルがあります：

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-23-19-12-50.png)

対応テーブルに新しいレコードを追加すれば、新しいアクションが定義されます。勿論データベースの管理ツールでテーブルを編集して、直接レコードを追加することができますが、メンテナンスが悪いです。このついて、odooはメンテナンス安い方法を提供しています。

まず、一番簡単なアクションURLアクションを作って見ます。下記の様なxmlファイルを作成します、名前は何でもいいですが、ここはhello/views/actions.xmlとなります。

```xml
<!-- hello/views/actions.xml -->
<odoo>
    <data>
        <record id="action_hello_url" model="ir.actions.act_url">
            <field name="name">Hello url action</field>
            <field name="url">http://www.google.com/</field>
            <field name="target">new</field>
        </record>
    </data>
</odoo>
```

上記xmlファイルの意味は、モデルir.actions.act_urlに新しいレコード:
nameフィルドがHello url action
urlフィルドがhttp://www.google.com/
tagetフィルドがnew
を追加する。モデルir.actions.act_urlはodoo/addons/base/models/ir_actions.pyファイルに定義されます。

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


IrActionsActUrlクラスの_tableフィルド、値が'ir_act_url'によると、モデル'ir.actions.act_url'とテーブル'ir_act_url'の対応関係がすぐ分かります。

そして、helloモジュールの定義ファイル```__manifest__.py```のdata項目にactions.xmlファイルを追加します。

```python
    ...
    # always loaded
    'data': [
        'views/actions.xml',
    ],
    ...
```

下記のコマンドでhelloモージュルを更新してodooを起動します。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

起動成功すればir_act_urlテーブルを確認すると追加されたアクションレコードが見えます。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-23-19-55-07.png)


### メニュー作成

次は新しいメニュー項目を作成して上記アクションを呼び出します

メニュー作成方法はアクションの作成方法大体同じ、まず、views/menu.xmlファイルを作成して、下記内容を追加します。

```xml
<odoo>
    <data>
        <menuitem name="Hello" id="hello.menu_root"  action="hello.action_hello_msg" />
    </data>
</odoo>
```

上記xmlファイルにactionが"hello.action_hello_msg"と設定されます、つまり、このメーニュをクリックすると、"hello.action_hello_msg"アクションを呼び出すことができます。

上記xmlファイルを使用のため、helloモジュールの定義ファイル```__manifest__.py```のdata項目にmenu.xmlファイルを追加します。

```python
    ...
    # always loaded
    'data': [
        'views/actions.xml',
        'views/menu.xml'
    ],
    ...
```

再度コマンドでhelloモジュールを更新して起動します。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

起動成功すれば、odooの画面を開くするとトップメニューにはHelloのメニューを見えます。ただし、アクションがないメニュー項目が表示されないので注意が必要です。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-24-11-47-55.png)

Helloメニューをクリックすると、新しいページhttp:://www.google.comが開けます。


### ビィー作成

odooのビューが下記の種類があります：

* Lists
* Forms
* Graphs
* Pivots
* Kanban
* Calendar
* Gantt
* Diagram
* Dashboard
* Cohort
* Activity
* Search
* QWeb

QWebが普通のHTMLタッグも使えますから、一番理解安いと思います。では簡単のQWebビューから作りしましょう。

まず、template.xmlを作成し、下記のコードを入力します。

```xml
<odoo>
    <data>
        <template id="hello_msg">
            <h1>Hello</h1>
        </template>
    </data>
</odoo>
```

次は定義ファイル```__manifest__.py```のdata項目に追加します。

```python
    # always loaded
    'data': [
        'views/templates.xml',
        'views/actions.xml',
        'views/menu.xml',        
    ],
```

ここまで、qwebビュー"hello_msg"の定義が完了しました。ただし、このビューにアクセスすることがまたできないので、アクセスルードの定義が必要です。

hello/controllers/controllers.pyを編集して、下記のコードを入力します。

```python
# -*- coding: utf-8 -*-
from odoo import http

class Hello(http.Controller):
    @http.route('/hello/hello/', auth='public')
    def index(self, **kw):
        return http.request.render('hello.hello_msg')
```

そこまで、/hello/helloルードを定義しました。

```sh
$./odoo12/odoo-bin -d test_odoo -c test.conf -u hello
```

上記コマンドでhelloモジュールを更新して再起動します、問題なけれは、```http://localhost:8069/hello/hello/```をブラウザで開くと、下記の画面が見えます。

![](/assets/images/2019-05-23-odoo-action-and-view.markdown/2019-05-24-16-13-37.png)

最後、先ほど作成したURLアクション(/views/actions.xml)を下記のように変更して、再起動すると、Helloメニューから/hello/helloに遷移することが出来るになります。

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

