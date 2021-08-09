---
title: 最喜欢Symfony的几个设计
tags: [PHP, Symfony]
layout: post
description:
comments: true
published: true
date: 2021-08-09 14:12:01 +0900
mermaid: false
mathjax: false
datacamp: false
---

最近因为要做一个ec-cube（一个基于symfony框架的日本电商网站）的项目，非常想说说喜欢几个Symfony设计，因为这几个设计非常能提高开发效率：

- 调试页面
- 路由声明
- 配置文件管理机制
- 服务容器

## 调试页面

在开发模式下，每个页面加载成功后，Symfony都会在右下角显示一个Symfony toolbar按钮。

<img src='/assets/images/2021-08-09-favorite-designs-for-symfony.markdown/2021-08-09-12-13-17.png' width='32'/>

点击这个按钮会显示Symfony的工具条

![](/assets/images/2021-08-09-favorite-designs-for-symfony.markdown/2021-08-09-12-16-45.png)

在工具条上能看到页面加载时各个操作所需要的时间，点击工具条上的对于按钮，能打开更详细的调试页面。

![](/assets/images/2021-08-09-favorite-designs-for-symfony.markdown/2021-08-09-12-19-51.png)

这是我见过的Web后端开发最强大的调试页面，不仅能看到这个页面所执行的SQL文，还能看打页面的模板以及dump()函数输出的调试信息等等，这些对查找逻辑错误非常有帮助。

## 路由声明

Symfony提供了直接能在Control类的方法注释中声明路由和模板的方法，例如：

```php
    /**
     * @Route("/%eccube_admin_route%/content/block", name="admin_content_block")
     * @Template("@admin/Content/block.twig")
     */
    public function index(Request $request)
    {
        $DeviceType = $this->deviceTypeRepository
            ->find(DeviceType::DEVICE_TYPE_PC);

        // 登録されているブロック一覧の取得
        $Blocks = $this->blockRepository->getList($DeviceType);

        $event = new EventArgs(
            [
                'DeviceType' => $DeviceType,
                'Blocks' => $Blocks,
            ],
            $request
        );
        $this->eventDispatcher->dispatch(EccubeEvents::ADMIN_CONTENT_BLOCK_INDEX_COMPLETE, $event);

        return [
            'Blocks' => $Blocks,
        ];
    }
```

这样做的好处是全文搜索路由时，就能马上找到对应的控制函数，维护非常方便。


## 配置文件管理机制

Symfony为开发者提供了一套非常灵活而且直观的配置文件管理机制。它规定应用程序的配置文件都保存在config目录下

```shell
your-project/
├─ config/
│  ├─ packages/
│  ├─ bundles.php
│  ├─ routes.yaml
│  └─ services.yaml
├─ ...
```

上面是一个默认的配置文件目录结构。your-project是应用名称，routes.yaml文件定义了路由配置； services.yaml 文件配置了服务容器的服务； bundles.php 文件定义是否启用/禁用应用程序中的包(package)，各个包的配置文件放在config/packages/中。

Symfony会按照下面的顺序去读取对应配置文件的所有参数，而且后面读取的配置文件参数会自动覆盖前面读取的配置文件参数：

```xml
1 config/packages/*.yaml (包括*.xml，*.php文件);
2 config/packages/<environment-name>/*.yaml (包括*.xml和*.php文件);
3 config/services.yaml (包括services.xml和ervices.php文件);
4 config/services_<environment-name>.yaml (包括services_<environment-name>.xml和services_<environment-name>.php文件).
```

这里的```<environment-name>```是symfony的开发环境名，通常Symfony包括三个开发环境：dev (开发测试环境), prod (产品发布环境) 和test (自动测试环境)

这样设计做的好处就是我们可以很灵活地根据不同的开发环境进行不同的配置。比如：我们需要在dev环境下让monolog输出debug级别的调试信息而在prod环境下只输出info级别的信息时，就可以创建两个monolog.yaml配置文件：

```
config/packages/dev/monolog.yaml
config/packages/prod/monolog.yaml
```

然后分别在这两个不同的monolog.yaml写不同的配置就可以了。

详细参考：[Configuring Symfony](https://symfony.com/doc/current/configuration.html)

## 服务容器

Symfony中可以通过Component类来定义各种服务，然而这些服务类都必须在配置文件中注册以后才能被使用。例如我们在service.yaml中注册了一个S3Uploader的服务,这个服务的实现在Customize\Service\Media\S3Uploader
类中。

```yaml
## service.yaml
services:
    S3Uploader:
        class: Customize\Service\Media\S3Uploader
        arguments:
            - '@product_images_storage_filesystem'
        public: true
       
```

但是我们在开发环境下不想使用Customize\Service\Media\S3Uploader类，而是使用Customize\Service\Media\LocalUploader类，于是我们就可以在service.dev.yaml中LocalUploader去覆盖S3Uploader。

```yaml
## service.dev.yaml
Services:
    S3Uploader:
        class: Customize\Service\Media\LocalUploader
        arguments:
            - '@product_images_storage_filesystem'
        public: true
```

这样我们通过服务容器去使用服务时，就能实现在不同环境下使用不同的服务。

```php
    $loader = $this->container->get('S3Uploader');
    $loader->dosomthing();
```

## 总结

这种灵活而清晰的配置管理避免了在测试时去频繁修改文件，让开发非常有效率，而且不容易出错。可不可能让odoo也能引入这种机制？






