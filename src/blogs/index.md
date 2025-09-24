---
layout: main
title: Blogs
---
# Blogs

My writings.

## Computer Science

<ul>
{%- for post in collections.cs -%}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{%- endfor -%}
</ul>

## Math 

<ul>
{%- for post in collections.math -%}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{%- endfor -%}
</ul>