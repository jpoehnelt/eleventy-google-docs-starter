---
layout: layout.njk
eleventyComputed:
  title: "Eleventy and Google Docs Starter"
---

{% renderFile "README.md" %}

## Pages in the 'documents' collection

<ul>
{%- for doc in collections.documents|sort(false, true, 'url') -%}
  <li><a href="{{ doc.url }}">{{ doc.url }}</a></li>
{%- endfor -%}
</ul>
