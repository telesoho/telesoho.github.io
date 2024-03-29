---
title: odoo再開発日記一
tags: [odoo, model]
layout: post
description:
comments: true
published: true
date: 2019-05-22 9:02:01 +0900
mermaid: true
mathjax: true
---

この開発日記は自分で odoo を再開発する時に、解決が難しい問題と効率良くやり方とかを記述しております。

開発環境：
OS:ubuntu

作業フォルダ説明：

```txt
作業フォルダ
├── test.conf  # odoo配置ファイル
├── my_addons  # 開発モジュールの格納フォルダ
└── odoo12  # ここにodoo 12.0をインストルされました
```

### 目標

- [x] odoo の起動
- [x] モジュール(module)作成
- [x] モデルの継承と拡張

### odoo の起動

勿論 odoo 起動できるまでインストルが必要ですが、ここで説明の必要がないと思います。下記のサイトで参照すれば、簡単だと思います。

https://www.odoo.com/documentation/12.0/setup/install.html

開発時に画面で odoo のモジュールをインストルするのは面倒さいですから、コマンドラインで修正したモージュルをインストルすれば便利です。

ます、データベース test_odoo を指定して odoo を起動します。

```sh
$./odoo12/odoo-bin -d test_odoo
```

odoo_test が存在しない場合は、odoo_test が自動作成されて、odoo を起動します。

ウェブブラウザで http://localhost:8069 をアクセスすると下記の画面見えます。

![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-22-17-08-23.png)

管理員ユーザ admin がデータベースが自動作成するときにも自動作成されました、画面で Email に admin を入力、Password に admin を入力して、Login ボタンを押下してログインできます。

もっど odoo 起動パラメータが了解したい場合は、下記の資料を参照してください。

https://www.odoo.com/documentation/12.0/reference/cmdline.html#cmdoption-odoo-bin-d

### モジュールを作成

予定の addons フォルダに新しいモジュール(hello)を作成して見ましょう。

```sh
$./odoo12/odoo-bin scaffold hello ./my_addons
```

tree コマンドで hello のフォルダ構造を見ましょう。

```sh
$ tree ./my_addons
./my_addons
└── hello
    ├── controllers
    │   ├── controllers.py
    │   └── __init__.py
    ├── demo
    │   └── demo.xml
    ├── __init__.py
    ├── __manifest__.py
    ├── models
    │   ├── __init__.py
    │   └── models.py
    ├── security
    │   └── ir.model.access.csv
    └── views
        ├── templates.xml
        └── views.xml
```

test.conf の配置ファイルに my_addons フォルダを addons_path に追加します、注意：絶対パスで追加が必要です。

```conf
# test.conf
[options]
addons_path = /home/telesoho/prjs/odoo/idcodoo/odoo12/odoo/addons,/home/telesoho/prjs/odoo/idcodoo/odoo12/addons,/home/telesoho/prjs/odoo/idcodoo/my_addons
```

そして、モジュールをインストルして odoo を起動します

```sh
./odoo12/odoo-bin -c test.conf -d test_odoo -i hello
```

上記コマンドは-c test.conf で test.conf 配置ファイル指定すること、-i hello は hello モージュルを自動インストルすることです。

起動ローグで hello モージュルが起動されることが確認できます。

![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-22-17-58-06.png)

### モデルの継承と拡張

odoo はモデル拡張方法を３つ提供しています

- クラス継承(Class inheritance)
- 拡張(Extension inheritance)
- 代理継承(Delegation inheritance)

![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-22-19-26-09.png)

1. クラス継承(Class inheritance)

   - 新しい特徴をコピーするためを使う
   - テーブルが別々
   - 既存の view が新しいクラスを使用しない

   ```python
   # class inheritance
   class base1(models.Model):
       _name = 'hello.base0'
       _description = 'ベースモデル1'
       name = fields.Char()
       age = fields.Integer() # 年齢がInterger

   class class_inheritance(models.Model):
       _name = 'hello.base0_class_inheritance'
       _inherit = 'hello.base0'
       _description = 'class inheritance'
       age = fields.Float() # 年齢をFloatに変更する
       address = fields.Text() # アドレースを追加する
   ```

   モジュールを更新します。

   ```sh
   ./odoo12/odoo-bin -c test.conf -d test_odoo -i hello
   ```

   データベースを確認すると、hello_base0 と hello_base0_class_inheritance ２つテーブルが追加されました。

   ![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-22-19-45-57.png)

2. 拡張継承(Extension inheritance)

   - 新しい特徴を追加、或いは修正を使う
   - 同じテーブル
   - 既存の view が新しいクラスを使う

   ```python
   # /home/telesoho/prjs/odoo/idcodoo/my_addons/hello/models/models.py
   # extention inheritance
   class base(models.Model):
       _name = 'hello.base'
       _description = 'ベースモデル'
       name = fields.Char()
       age = fields.Integer() # 年齢がInterger

   class base_extention_inheritance(models.Model):
       _name = 'hello.base'
       _inherit = 'hello.base'
       _description = 'extention inheritance'
       age = fields.Float() # 年齢をFloatに変更する
       address = fields.Text() # アドレースを追加する
   ```

   データベースを確認すると、新しいテーブル hello_base が追加されました、age フィルドが Interger ではなく、Float 数になります、address フィルドも追加されました。

   ![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-23-11-01-37.png)

3. 代理継承(Delegation inheritance)

   - 多数継承できる
   - テーブルが別々
   - 既存の view が新しいクラスを使用しない

   ```python
   # /home/telesoho/prjs/odoo/idcodoo/my_addons/hello/models/models.py
   # delegation inheritance
   class Child0(models.Model):
       _name = 'hello.delegation.child0'
       _description = 'Delegation Child zero'

       field_0 = fields.Integer()

   class Child1(models.Model):
       _name = 'hello.delegation.child1'
       _description = 'Delegation Child one'

       field_1 = fields.Integer()

   class Delegating(models.Model):
       _name = 'hello.delegation.parent'
       _description = 'Delegation Parent'

       _inherits = {
           'hello.delegation.child0': 'child0_id',
           'hello.delegation.child1': 'child1_id',
       }

       child0_id = fields.Many2one('hello.delegation.child0', required=True, ondelete='cascade')
       child1_id = fields.Many2one('hello.delegation.child1', required=True, ondelete='cascade')

   ```

   下記コマンドで hello モージュルをインストルして、odoo を起動します。

   ```sh
   ./odoo12/odoo-bin shell -c test.conf  -d test_odoo -i hello
   ```

   上記コマンドには shell パラメタを使いますので、odoo 起動した後に、Python のコマンドシェルに入ります。

   ```
   odoo: <module 'odoo' from '/home/telesoho/prjs/odoo/idcodoo/odoo12/odoo/__init__.py'>
   openerp: <module 'odoo' from '/home/telesoho/prjs/odoo/idcodoo/odoo12/odoo/__init__.py'>
   self: res.users(1,)
   Python 3.5.2 (default, Nov 12 2018, 13:43:14)
   [GCC 5.4.0 20160609] on linux
   Type "help", "copyright", "credits" or "license" for more information.
   (Console)
   >>>
   ```

   コマンドシェルに下記の python コードを入力して、record を作成します。

   ```python
   >>> record = env['hello.delegation.parent'].create({
   ...         'child0_id': env['hello.delegation.child0'].create({'field_0': 0}).id,
   ...         'child1_id': env['hello.delegation.child1'].create({'field_1': 1}).id,
   ...     })
   >>> record
   hello.delegation.parent(1,)
   >>> record.field_0
   0
   >>> record.field_1
   1
   ```

   次のコードで代理フィルドから値を設定も可能です

   ```python
   >>> record.write({'field_1': 4})
   ```

   最後、作成したテーブルを確認しましょう。

   ![](/assets/images/2019-05-22-odoo-model.markdown/2019-05-22-20-14-33.png)
