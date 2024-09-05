---
title: 如何利用ChatGPT辅助开发工作
tags: [人工智能, 沟通, ChatGPT]
layout: post
description:
comments: true
published: true
date: 2024-03-04 15:34:01 +0800
mermaid: false
mathjax: false
datacamp: false
---

按照以下arxiv的API文档，将用户输入生成指定的API链接

····Markdown

### 3.1. Calling the API

As mentioned above, the API can be called with an HTTP request of type GET or POST. For our purposes, the main difference is that the parameters are included in the url for a GET request, but not for the POST request. Thus if the parameters list is unusually long, a POST request might be preferred.

The parameters for each of the API methods are explained below. For each method, the base url is

```API
`http://export.arxiv.org/api/{method_name}?{parameters}`
```

#### 3.1.1. Query Interface

The API query interface has `method_name=query`. The table below outlines the parameters that can be passed to the query interface. Parameters are separated with the `&` sign in the constructed url's.

|       |                |                        |              |              |
| :---- | :------------- | :--------------------- | :----------- | :----------- |
| query |                |                        |              |              |
| :--   | :--            | :--                    | :--          | :--          |
|       | **parameters** | **type**               | **defaults** | **required** |
|       | `search_query` | string                 | None         | No           |
|       | `id_list`      | comma-delimited string | None         | No           |
|       | `start`        | int                    | 0            | No           |
|       | `max_results`  | int                    | 10           | No           |

##### 3.1.1.1. SEARCH_QUERY AND ID_LIST LOGIC

We have already seen the use of `search_query` in the [quickstart](https://info.arxiv.org/help/api/user-manual.html#Quickstart) section. The `search_query` takes a string that represents a search query used to find articles. The construction of `search_query` is described in the [search query construction appendix](https://info.arxiv.org/help/api/user-manual.html#query_details). The `id_list` contains a comma-delimited list of arXiv id's.

The logic of these two parameters is as follows:

- If only `search_query` is given (`id_list` is blank or not given), then the API will return results for each article that matches the search query.

- If only `id_list` is given (`search_query` is blank or not given), then the API will return results for each article in `id_list`.

- If *BOTH* `search_query` and `id_list` are given, then the API will return each article in `id_list` that matches `search_query`. This allows the API to act as a results filter.

This is summarized in the following table:

|                            |                       |                                                      |
| :------------------------- | :-------------------- | :--------------------------------------------------- |
| **`search_query` present** | **`id_list` present** | **API returns**                                      |
| :--                        | :--                   | :--                                                  |
| yes                        | no                    | articles that match `search_query`                   |
| no                         | yes                   | articles that are in `id_list`                       |
| yes                        | yes                   | articles in `id_list` that also match `search_query` |

##### 3.1.1.2. START AND MAX_RESULTS PAGING

Many times there are hundreds of results for an API query. Rather than download information about all the results at once, the API offers a paging mechanism through `start` and `max_results` that allows you to download chucks of the result set at a time. Within the total results set, `start` defines the index of the first returned result, *using 0-based indexing*. `max_results` is the number of results returned by the query. For example, if wanted to step through the results of a `search_query` of `all:electron`, we would construct the urls:

```API
`http://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=10 (1)
http://export.arxiv.org/api/query?search_query=all:electron&start=10&max_results=10 (2)
http://export.arxiv.org/api/query?search_query=all:electron&start=20&max_results=10 (3)
`
```

1. Get results 0-9

2. Get results 10-19

3. Get results 20-29

Detailed examples of how to perform paging in a variety of programming languages can be found in the [examples](https://info.arxiv.org/help/api/user-manual.html#detailed_examples) section.

^In cases where the API needs to be called multiple times in a row, we encourage you to play nice and incorporate a 3 second delay in your code. The [detailed examples](https://info.arxiv.org/help/api/user-manual.html#detailed_examples) below illustrate how to do this in a variety of languages.^

^Because of speed limitations in our implementation of the API, the maximum number of results returned from a single call (`max_results`) is limited to 30000 in slices of at most 2000 at a time, using the `max_results` and `start` query parameters. For example to retrieve matches 6001-8000: <http://export.arxiv.org/api/query?search\_query=all:electron&start=6000&max\_results=8000^>

Large result sets put considerable load on the server and also take a long time to render. We recommend to refine queries which return more than 1,000 results, or at least request smaller slices. For bulk metadata harvesting or set information, etc., the [OAI-PMH](https://info.arxiv.org/help/oa/index.html) interface is more suitable. A request with `max_results` \>30,000 will result in an HTTP 400 error code with appropriate explanation. A request for 30000 results will typically take a little over 2 minutes to return a response of over 15MB. Requests for fewer results are much faster and correspondingly smaller.

##### 3.1.1.3. SORT ORDER FOR RETURN RESULTS

There are two options for for the result set to the API search, `sortBy` and `sortOrder`.

`sortBy` can be "relevance", "lastUpdatedDate", "submittedDate"

`sortOrder` can be either "ascending" or "descending"

A sample query using these new parameters looks like:

```API
`http://export.arxiv.org/api/query?search_query=ti:"electron thermal conductivity"&sortBy=lastUpdatedDate&sortOrder=ascending`
```

### 3.2. The API Response

Everything returned by the API in the body of the HTTP responses is Atom 1.0, including [errors](https://info.arxiv.org/help/api/user-manual.html#errors). Atom is a grammar of XML that is popular in the world of content syndication, and is very similar to RSS for this purpose. Typically web sites with dynamic content such as news sites and blogs will publish their content as Atom or RSS feeds. However, Atom is a general format that embodies the concept of a list of items, and thus is well-suited to returning the arXiv search results.
····
