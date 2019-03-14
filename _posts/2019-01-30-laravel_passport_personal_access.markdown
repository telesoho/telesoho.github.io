---
title: Laravel的OAuth认证
tags:  [Laravel]
layout: post
description: 
comments: true
published: false
date: 2019-01-30 9:02:01 +0900
mermaid: false
mathjax: false
---

## Laravel OAuth认证

1. Person access client

    当我们用HasApiTokens::createToken()函数创建一个新的Token时，调用了ClientRepository::personalAccessClient()函数取得PersonalA access client,
    ```php
    public function personalAccessClient()
    {
        if (Passport::$personalAccessClientId) {
            return $this->find(Passport::$personalAccessClientId);
        }

        $client = Passport::personalAccessClient();

        return $client->orderBy($client->getKeyName(), 'desc')->first()->client;
    }
    ```
    由此得知，该函数从数据库的oauth_personal_access_clients表中查找最大ID的记录中的client_id。


