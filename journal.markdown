---
title: Journal
layout: index
bodyclass: journal
---

*Tech, mainly.  [Subscribe](/feed.xml).*

<ul class="archive">
{% for post in site.posts %}
  <li>
      <time>{{ post.date | date: "%Y年%m月%d日 " }}</time>
      <a href="{{ post.url }}">{{ post.title }}</a>      
  </li>
{% endfor %}
</ul>
