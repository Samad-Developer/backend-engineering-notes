# What is Node.js?

> A beginner-friendly explanation.

## Definition

**Node.js is a JavaScript runtime that allows JavaScript to run outside
the browser and provides built-in APIs for building backend
applications.**

------------------------------------------------------------------------

## Why Was Node.js Created?

Originally, JavaScript could only run inside web browsers. It could
manipulate web pages but could not read files, create servers, connect
to databases, or access the operating system.

Node.js was created to solve this problem.

------------------------------------------------------------------------

## What is a Runtime?

A runtime is a program that executes JavaScript code and provides
additional APIs.

-   JavaScript = Programming language
-   Runtime = Environment that runs the language

Two common JavaScript runtimes:

-   Browser
-   Node.js

------------------------------------------------------------------------

## Browser vs Node.js

### Browser

Provides APIs like `document`, `window`, `fetch`, and `localStorage`.

### Node.js

Provides backend APIs like:

-   `fs`
-   `http`
-   `path`
-   `os`
-   `events`

``` text
JavaScript
    |
    v
Node.js Runtime
    |
    +-- V8 Engine
    +-- Node APIs
```

------------------------------------------------------------------------

## What Can You Build?

-   Web servers
-   REST APIs
-   Database applications
-   File processing
-   Real-time applications

------------------------------------------------------------------------

## Is Node.js a Programming Language?

No. JavaScript is the language. Node.js is the runtime.

------------------------------------------------------------------------

## Is Node.js a Framework?

No. Express, Fastify, and NestJS are frameworks built on top of Node.js.

------------------------------------------------------------------------

## Analogy

-   JavaScript = Driver
-   Node.js = Car

The driver knows how to drive. The car makes it possible to travel.

Similarly, JavaScript contains your code, while Node.js provides the
environment to execute it outside the browser.

------------------------------------------------------------------------

## One Sentence to Remember

> **Node.js is a JavaScript runtime that lets JavaScript run outside the
> browser and provides APIs for building backend applications.**
