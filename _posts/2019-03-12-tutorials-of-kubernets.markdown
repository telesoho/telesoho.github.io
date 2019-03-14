---
title: kubernets入门
tags:  [kubernets, tutorial]
layout: post
description: 
comments: true
published: false
date: 2019-03-12 15:02:01 +0900
mermaid: false
mathjax: false
---

## kubernets入门

[Kubernetes](https://kubernetes.io) 是用于自动部署，扩展和管理容器化应用程序的开源系统。Kubernetes是构建在Google 15年生产环境经验基础之上,并结合来自社区的最佳创意和实践。


### 使用和理解Kubernetes

使用Kubernetes，可以通过Kubernetes API对象（主要是命令kubectl）来定义集群的预期状态（desired state）*。一旦你设置目标状态，Kubernetes会自动执行各类任务。

#### Kubernetes对象

1. 使用yaml来定义Kubernetes对象,

    ```yaml
    apiVersion: apps/v1 # for versions before 1.9.0 use apps/v1beta2
    kind: Deployment
    metadata:
    name: nginx-deployment
    spec:
    selector:
        matchLabels:
        app: nginx
    replicas: 2 # tells deployment to run 2 pods matching the template
    template:
        metadata:
        labels:
            app: nginx
        spec:
        containers:
        - name: nginx
            image: nginx:1.7.9
            ports:
            - containerPort: 80
    ```

1. 使用kubectl创建kubernetes对象

    ```sh
    kubectl create -f https://k8s.io/examples/application/deployment.yaml --record
    ```

### 创建集群(Create a Cluser)

![](/assets/images/2019-03-12-17-09-55.svg)

确认kubernetes版本

```sh
$ minikube version
minikube version: v0.34.1
```

输入minikube start启动集群:

```sh
$ minikube start
o   minikube v0.34.1 on linux (amd64)
>   Configuring local host environment ...
>   Creating none VM (CPUs=2, Memory=2048MB, Disk=20000MB) ...
-   "minikube" IP address is 172.17.0.82
-   Configuring Docker as the container runtime ...
-   Preparing Kubernetes environment ...
@   Downloading kubelet v1.13.3
@   Downloading kubeadm v1.13.3
-   Pulling images required by Kubernetes v1.13.3 ...
-   Launching Kubernetes v1.13.3 using kubeadm ...
-   Configuring cluster permissions ...
-   Verifying component health .....
+   kubectl is now configured to use "minikube"
=   Done! Thank you for using minikube!
```

确认集群信息

```sh
$ kubectl cluster-info
Kubernetes master is running at https://172.17.0.82:8443
KubeDNS is running at https://172.17.0.82:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

确认节点信息

```sh
$ kubectl get nodes
NAME       STATUS   ROLES    AGE    VERSION
minikube   Ready    master   8m8s   v1.13.3
```

### 创建应用部署

![](/assets/images/2019-03-12-19-09-10.svg)

通过kubectl run命令部署一个docker镜像(https://gcr.io/google-samples/kubernetes-bootcamp:v1)

```sh
$ kubectl run kubernetes-bootcamp --image=gcr.io/google-samples/kubernetes-bootcamp:v1 --port=8080
kubectl run --generator=deployment/apps.v1 is DEPRECATED and will be removed in a future version. Use kubectl run --generator=run-pod/v1 or kubectl create instead.
deployment.apps/kubernetes-bootcamp created
$
```

应用部署会完成如下工作：

* 查找可运行应用的节点;
* 在应用加入节点运行计划;
* 配置集群在需要的时候在新的节点上启动应用。

集群根据计划在节点上启动应用(称为:Pod),可以通过命令来查看部署信息：

```sh
$ kubectl get deployments
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
kubernetes-bootcamp   1/1     1            1           12m
```

### 查看Pods和Nodes

在创建Deployment时，Kubernetes会创建一个Pod来托管应用。Pod是Kubernetes中一个抽象化概念，由一个或多个容器组合在一起得共享资源。这些资源包括：

* 共享存储，如 Volumes 卷
* 网络，唯一的集群IP地址
* 每个容器运行的信息，例如:容器镜像版本

Pod模型是特定应用程序的“逻辑主机”，并且包含紧密耦合的不同应用容器。

Pod中的容器共享IP地址和端口。

Pod是Kubernetes中的最小单位，当在Kubernetes上创建Deployment时，该Deployment将会创建具有容器的Pods（而不会直接创建容器），每个Pod将被绑定调度到Node节点上，并一直保持在那里直到被终止（根据配置策略）或删除。在节点出现故障的情况下，群集中的其他可用节点上将会调度之前相同的Pod。

Pods是私有的，默认只能在集群里访问。但我们可以新开一个终端，然后使用kubectl命令生成一个代理接口(proxy)[^2]：

```sh
$ kubectl proxy
Starting to serve on 127.0.0.1:8001
```

接口公开后，就可以通过http协议查询API版本信息：

```sh
$ curl http://localhost:8001/version
{
  "major": "1",
  "minor": "13",
  "gitVersion": "v1.13.3",
  "gitCommit": "721bfa751924da8d1680787490c54b9179b1fed0",
  "gitTreeState": "clean",
  "buildDate": "2019-02-01T20:00:57Z",
  "goVersion": "go1.11.5",
  "compiler": "gc",
  "platform": "linux/amd64"
}
```

API服务器会自动为每个Pod生成一个基于pod名称的endpoint[^1]，同样也可以通过上面的Proxy[^2]来访问。

首先我们得获取Pod名称并保存到环境变量POD_NAME中:

```sh
$ export POD_NAME=$(kubectl get pods -o go-template --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')
$ echo Name of the Pod: $POD_NAME
Name of the Pod: kubernetes-bootcamp-6bf84cb898-859bp
```

然后我们可以通过HTTP请求去运行Pod上的应用:

```sh
$ curl http://localhost:8001/api/v1/namespaces/default/pods/$POD_NAME/proxy/
Hello Kubernetes bootcamp! | Running on: kubernetes-bootcamp-6bf84cb898-859bp | v=1
```

获取Pod日志

```sh
$ kubectl logs $POD_NAME
Kubernetes Bootcamp App Started At: 2019-03-14T02:36:39.795Z | Running On:  kubernetes-bootcamp-6bf84cb898-s2pr5

Running On: kubernetes-bootcamp-6bf84cb898-s2pr5 | Total Requests: 1 | App Uptime: 199.088 seconds | Log Time: 2019-03-14T02:39:58.884Z
Running On: kubernetes-bootcamp-6bf84cb898-s2pr5 | Total Requests: 2 | App Uptime: 799.364 seconds | Log Time: 2019-03-14T02:49:59.159Z
```

一旦Pod已经启动和执行，就可以使用exec命令去执行容器内部的命令:

比如显示容器的环境变量:

```sh
$ kubectl exec $POD_NAME env
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=kubernetes-bootcamp-6bf84cb898-s2pr5
KUBERNETES_PORT_443_TCP_ADDR=10.96.0.1
KUBERNETES_SERVICE_HOST=10.96.0.1
KUBERNETES_SERVICE_PORT=443
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_PORT=tcp://10.96.0.1:443
KUBERNETES_PORT_443_TCP=tcp://10.96.0.1:443
KUBERNETES_PORT_443_TCP_PROTO=tcp
KUBERNETES_PORT_443_TCP_PORT=443
NPM_CONFIG_LOGLEVEL=info
NODE_VERSION=6.3.1
HOME=/root
```

接下来，启动容器的一个bash会话(session):

```sh
$ kubectl exec -ti $POD_NAME bash
root@kubernetes-bootcamp-6bf84cb898-s2pr5:/#
```

查看容器的原始代码:

```sh
root@kubernetes-bootcamp-6bf84cb898-s2pr5:/# cat server.js
var http = require('http');
var requests=0;
var podname= process.env.HOSTNAME;
var startTime;
var host;
var handleRequest = function(request, response) {
  response.setHeader('Content-Type', 'text/plain');
  response.writeHead(200);
  response.write("Hello Kubernetes bootcamp! | Running on: ");
  response.write(host);
  response.end(" | v=1\n");
  console.log("Running On:" ,host, "| Total Requests:", ++requests,"| App Uptime:", (new Date() - startTime)/1000 , "seconds", "| Log Time:",new Date());
}
var www = http.createServer(handleRequest);
www.listen(8080,function () {
    startTime = new Date();;
    host = process.env.HOSTNAME;
    console.log ("Kubernetes Bootcamp App Started At:",startTime, "| Running On: " ,host, "\n" );
});
```

确定应用运行状态：

```sh
root@kubernetes-bootcamp-6bf84cb898-s2pr5:/# curl localhost:8080
Hello Kubernetes bootcamp! | Running on: kubernetes-bootcamp-6bf84cb898-s2pr5 | v=1
```

退出容器bash:

```sh
root@kubernetes-bootcamp-6bf84cb898-s2pr5:/# exit
exit
```

### 通过服务暴露应用

Kubernetes Services概述

（凡人皆有一死来描述pod，没有比这跟准确的了）。事实上，Pod是有生命周期的。当一个工作节点(Node)销毁时，节点上运行的Pod也会销毁，然后通过ReplicationController动态创建新的Pods来保持应用的运行。作为另一个例子，考虑一个图片处理 backend，它运行了3个副本，这些副本是可互换的 —— 前端不需要关心它们调用了哪个 backend 副本。也就是说，Kubernetes集群中的每个Pod都有一个独立的IP地址，甚至是同一个节点上的Pod，因此需要有一种方式来自动协调各个Pod之间的变化，以便应用能够持续运行。

Kubernetes中的Service 是一个抽象的概念，它定义了Pod的逻辑分组和一种可以访问它们的策略，这组Pod能被Service访问，使用YAML （优先）或JSON 来定义Service，Service所针对的一组Pod通常由LabelSelector实现（参见下文，为什么可能需要没有 selector 的 Service）。

可以通过type在ServiceSpec中指定一个需要的类型的 Service，Service的四种type:

* ClusterIP（默认） - 在集群中内部IP上暴露服务。此类型使Service只能从群集中访问。
* NodePort - 通过每个 Node 上的 IP 和静态端口（NodePort）暴露服务。NodePort 服务会路由到 ClusterIP 服务，这个 ClusterIP 服务会自动创建。通过请求 <NodeIP>:<NodePort>，可以从集群的外部访问一个 NodePort 服务。
* LoadBalancer - 使用云提供商的负载均衡器（如果支持），可以向外部暴露服务。外部的负载均衡器可以路由到 NodePort 服务和 ClusterIP 服务。
* ExternalName - 通过返回 CNAME 和它的值，可以将服务映射到 externalName 字段的内容，没有任何类型代理被创建。这种类型需要v1.7版本或更高版本kube-dnsc才支持。

更多不同类型Service的信息，请参考“Using Source IP”教程，Connecting Applications with Services。

使用ExternalName类型可以实现一种情况，在创建Service涉及未定义selector的示例，创建的Service selector不创建相应的Endpoints对象，可以通过手动将Service映射到特定Endpoints。

Kubernetes Service 是一个抽象层，它定义了一组逻辑的Pods，借助Service，应用可以方便的实现服务发现与负载均衡。

1. 创建新服务

    先获取节点信息:

    ```sh
    $ kubectl get nodes
    NAME       STATUS   ROLES    AGE    VERSION
    minikube   Ready    master   118s   v1.13.3
    ```

    再获取服务信息:

    ```sh
    $ kubectl get services
    NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
    kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   2m
    ```

    可以看到，我们已经有了一个minikube启动的时候默认创建的服务kubernetes，可以通过expose命令去创建一个新的服务：

    ```sh
    $ kubectl expose deployment/kubernetes-bootcamp --type="NodePort" --port 8080
    service/kubernetes-bootcamp exposed
    $ kubectl get services
    NAME                  TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
    kubernetes            ClusterIP   10.96.0.1        <none>        443/TCP          4m15s
    kubernetes-bootcamp   NodePort    10.101.151.177   <none>        8080:32377/TCP   94s
    ```

    现在我们有了一个运行中的服务kubernetes-bootcamp，该服务有一个唯一的簇IP、一个内部端口号和一个外部IP。

    可以使用kubectl describe查看kubernetes-bootcamp服务的详细信息：

    ```sh
    $ kubectl describe services/kubernetes-bootcamp
    Name:                     kubernetes-bootcamp
    Namespace:                default
    Labels:                   run=kubernetes-bootcamp
    Annotations:              <none>
    Selector:                 run=kubernetes-bootcamp
    Type:                     NodePort
    IP:                       10.101.151.177
    Port:                     <unset>  8080/TCP
    TargetPort:               8080/TCP
    NodePort:                 <unset>  32377/TCP
    Endpoints:                172.18.0.4:8080
    Session Affinity:         None
    External Traffic Policy:  Cluster
    Events:                   <none>
    ```

1. 使用标签

    标签可以在创建时附加到对象上，或者过后附加到对象上。可以使用kubectl describe查看pod的标签。

    ```sh
    $ kubectl describe pods $POD_NAME
    Name:               kubernetes-bootcamp-6bf84cb898-trwjj
    Namespace:          default
    Priority:           0
    PriorityClassName:  <none>
    Node:               minikube/172.17.0.15
    Start Time:         Thu, 14 Mar 2019 07:15:58 +0000
    Labels:             app=v1
                        pod-template-hash=6bf84cb898
                        run=kubernetes-bootcamp
    Annotations:        <none>
    Status:             Running
    IP:                 172.18.0.4
    Controlled By:      ReplicaSet/kubernetes-bootcamp-6bf84cb898
    Containers:
    kubernetes-bootcamp:
        Container ID:   docker://f6aaa7c355a4073d88622fa66e4c8a7854b860997127d9629e30f114351bb817
        Image:          gcr.io/google-samples/kubernetes-bootcamp:v1
        Image ID:       docker-pullable://jocatalin/kubernetes-bootcamp@sha256:0d6b8ee63bb57c5f5b6156f446b3bc3b3c143d233037f3a2f00e279c8fcc64af
        Port:           8080/TCP
        Host Port:      0/TCP
        State:          Running
        Started:      Thu, 14 Mar 2019 07:16:01 +0000
        Ready:          True
        Restart Count:  0
        Environment:    <none>
        Mounts:
        /var/run/secrets/kubernetes.io/serviceaccount from default-token-vwx9d (ro)
    Conditions:
    Type              Status
    Initialized       True
    Ready             True
    ContainersReady   True
    PodScheduled      True
    Volumes:
    default-token-vwx9d:
        Type:        Secret (a volume populated by a Secret)
        SecretName:  default-token-vwx9d
        Optional:    false
    QoS Class:       BestEffort
    Node-Selectors:  <none>
    Tolerations:     node.kubernetes.io/not-ready:NoExecute for 300s
                    node.kubernetes.io/unreachable:NoExecute for 300s
    Events:
    Type    Reason     Age    From               Message
    ----    ------     ----   ----               -------
    Normal  Scheduled  5m31s  default-scheduler  Successfully assigned default/kubernetes-bootcamp-6bf84cb898-trwjj to minikube
    Normal  Pulled     5m29s  kubelet, minikube  Container image "gcr.io/google-samples/kubernetes-bootcamp:v1" already present on machine
    Normal  Created    5m28s  kubelet, minikube  Created container
    Normal  Started    5m28s  kubelet, minikube  Started container
    ```

    这里看到这个Pod有3个标签,可以通过标签来查询Pod列表。

    ```sh
    $ kubectl get pods -l app=v1
    NAME                                   READY   STATUS    RESTARTS   AGE
    kubernetes-bootcamp-6bf84cb898-trwjj   1/1     Running   0          11m
    $ kubectl get pods -l run=kubernetes-bootcamp
    NAME                                   READY   STATUS    RESTARTS   AGE
    kubernetes-bootcamp-6bf84cb898-trwjj   1/1     Running   0          11m
    ```

    或者通过标签删除服务。

    ```sh
    $ kubectl delete service -l run=kubernetes-bootcamp
    service "kubernetes-bootcamp" deleted
    $ kubectl get services
    NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
    kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   24m    
    ```

    服务被删除后，将无法从簇外部访问应用:

    ```sh
    $ curl $(minikube ip):$NODE_PORT
    curl: (7) Failed to connect to 172.17.0.15 port 80: Connection refused
    ```

    但，如果执行Pod内部的curl，可以看到应用是运行状态的。

    ```sh
    $ kubectl exec -ti $POD_NAME curl localhost:8080
    Hello Kubernetes bootcamp! | Running on: kubernetes-bootcamp-6bf84cb898-trwjj | v=1    
    ```

### 应用伸缩(Scale Your App)

前面，我们创建了一个Deployment，然后通过Service暴露，Deployment创建的Pod来运行应用，当流量增加时，我们需要扩展应用来满足用户需求。

通过Deployment更改副本数可以实现伸缩。

使用Deployment扩展能确保在新的可用Node资源上创建Pods，缩小比例将减少Pod的数量到理想状态。如果伸缩需求是0，将会终止Deployment指定的所有Pod。Kubernetes还支持[自动缩放Pods](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)。

运行应用将要考虑一些情况，需要将流量分配给所有实例。Service集成了负载均衡器，可以将网络流量分配到Deployment暴露的所有Pod中。Service将使用Endpoints持续监控运行的Pod，以确保仅将流量分配到可用的Pod。

首先，看看当前的deployments:

```sh
$ kubectl get deployments
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
kubernetes-bootcamp   1/1     1            1           3m7s
```

接着,使用scale命令调整部署为4个副本:

```sh
$ kubectl scale deployments/kubernetes-bootcamp --replicas=4
deployment.extensions/kubernetes-bootcamp scaled
```

再次查看deployments，可以看到已有4个可用的应用。

```sh
$ kubectl get deployments
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
kubernetes-bootcamp   4/4     4            4           3m15s
```

接下来，可以查看运行pod的数量:

```sh
$ kubectl get pods -o wide
NAME                                   READY   STATUS    RESTARTS   AGE     IP           NODE       NOMINATED NODE   READINESS GATES
kubernetes-bootcamp-6bf84cb898-54mht   1/1     Running   0          6m58s   172.18.0.6   minikube   <none>           <none>
kubernetes-bootcamp-6bf84cb898-78zvd   1/1     Running   1          10m     172.18.0.4   minikube   <none>           <none>
kubernetes-bootcamp-6bf84cb898-pz67p   1/1     Running   0          6m58s   172.18.0.7   minikube   <none>           <none>
kubernetes-bootcamp-6bf84cb898-tzhld   1/1     Running   0          6m58s   172.18.0.5   minikube   <none>           <none>
```



## 相关文档

* [Kubernetes中文文档](http://docs.kubernetes.org.cn/)
* [kubernetes入门-知乎](https://zhuanlan.zhihu.com/p/32618563)

[^1]: the endpoint is the URL where your service can be accessed by a client application.

[^2]: By definition, Web services can be communicated with over a network using industry standard protocols, including SOAP. That is, a client and a Web service communicate using SOAP messages, which encapsulate the in and out parameters as XML. Fortunately, for Web service clients, the proxy class handles the work of mapping parameters to XML elements and then sending the SOAP message over the network.