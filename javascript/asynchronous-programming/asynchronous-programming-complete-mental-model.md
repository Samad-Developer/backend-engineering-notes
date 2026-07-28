# JavaScript Asynchronous Programming --- Complete Mental Model

> Goal: Understand how JavaScript handles asynchronous operations such
> as database queries, file reading, network requests, and timers.

## 1. JavaScript is Single-Threaded

JavaScript executes **one piece of JavaScript code at a time**. It has
one JavaScript thread, meaning only one function executes at any given
moment.

``` text
JavaScript Thread
Task A
 ↓
Task B
 ↓
Task C
```

**Important:** Single-threaded does **not** mean the entire computer can
only do one thing. The operating system, database, and networking stack
can all work simultaneously. Only JavaScript code runs one piece at a
time.

------------------------------------------------------------------------

## 2. Why Asynchronous Programming Exists

Backend applications spend most of their time waiting for slow
operations:

-   Database queries
-   Reading files
-   Writing files
-   Calling external APIs
-   Network communication

Instead of blocking the JavaScript thread, JavaScript delegates these
operations to external systems.

------------------------------------------------------------------------

## 3. Who Actually Does the Work?

JavaScript coordinates the work; it does not perform it.

-   `await prisma.user.findMany()` → Database executes the SQL.
-   `await fs.readFile()` → Operating system reads the file.
-   `await fetch()` → Networking stack sends the request.

``` text
JavaScript
      │
      ▼
Node.js / Operating System
      │
      ▼
Database / File System / Network
```

------------------------------------------------------------------------

## 4. The Call Stack

The **Call Stack** keeps track of which JavaScript function is currently
executing.

It behaves like a stack (LIFO):

-   Push → Add a function.
-   Pop → Remove a function.

Only the function at the top executes.

------------------------------------------------------------------------

## 5. Run-to-Completion Guarantee

Once JavaScript starts executing a function, it **always finishes that
function before another JavaScript function begins**.

This makes JavaScript predictable because no function is interrupted
halfway through.

------------------------------------------------------------------------

## 6. Promise

A **Promise** is an object representing a value that will be available
in the future.

States:

-   **Pending** → Work is still running.
-   **Fulfilled** → Completed successfully.
-   **Rejected** → Failed.

A Promise is like an order receipt---you don't have the final result
yet, but you have a guarantee that it will either succeed or fail later.

------------------------------------------------------------------------

## 7. What `await` Really Does

`await` does **not** freeze JavaScript.

It pauses **only the current async function** until the Promise settles.

Think of it as placing a bookmark in a book. When the Promise finishes,
JavaScript resumes from that bookmark.

------------------------------------------------------------------------

## 8. The Event Loop

The Event Loop is a coordinator.

Its primary responsibility is:

> **Check whether the Call Stack is empty.**

-   If the Call Stack is busy → Wait.
-   If the Call Stack is empty → Execute waiting tasks.

The Event Loop never interrupts running JavaScript.

------------------------------------------------------------------------

## 9. The Two Queues

### Microtask Queue

Contains:

-   `Promise.then()`
-   `Promise.catch()`
-   `Promise.finally()`
-   `async/await` continuations

### Callback (Macrotask) Queue

Contains:

-   `setTimeout`
-   `setInterval`
-   I/O callbacks
-   `setImmediate` (Node.js)

------------------------------------------------------------------------

## 10. Event Loop Priority

The Event Loop always follows this order:

1.  Execute everything on the Call Stack.
2.  Empty the Microtask Queue.
3.  Execute one Callback Queue task.
4.  Repeat.

Priority:

``` text
Call Stack
     ↓
Microtask Queue
     ↓
Callback Queue
```

------------------------------------------------------------------------

## 11. Example

``` js
console.log("Start");

setTimeout(() => console.log("Timeout"), 0);

Promise.resolve().then(() => console.log("Promise"));

console.log("End");
```

Output:

``` text
Start
End
Promise
Timeout
```

Reason: Promise callbacks go to the Microtask Queue, which has higher
priority than the Callback Queue.

------------------------------------------------------------------------

## 12. How `await` Works Internally

``` text
Start async function
        ↓
Start database query
        ↓
Promise created (Pending)
        ↓
Database performs work
        ↓
Promise becomes Fulfilled
        ↓
Continuation enters Microtask Queue
        ↓
Event Loop waits for Call Stack to become empty
        ↓
Continuation moves to Call Stack
        ↓
Async function resumes
```

------------------------------------------------------------------------

## 13. Complete Architecture

``` text
                JavaScript Thread
                       │
                       ▼
                 ┌─────────────┐
                 │ Call Stack  │
                 └─────────────┘
                       ▲
                       │
                 Event Loop
                       ▲
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
   Microtask Queue           Callback Queue
 (Promise / await)      (setTimeout / I/O)
          ▲                         ▲
          └────────────┬────────────┘
                       │
             Node.js / Operating System
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   Database        File System      Network
```

------------------------------------------------------------------------

## Complete Story

JavaScript is **single-threaded**, meaning only one piece of JavaScript
executes at a time on the **Call Stack**. Slow operations such as
database queries, file reads, and network requests are delegated to
external systems. Those operations immediately return a **Promise**,
which represents a future value. When using `await`, only the current
async function pauses. After the external work completes, the Promise
becomes fulfilled (or rejected), and its continuation is placed into the
**Microtask Queue**. The **Event Loop** continuously checks whether the
**Call Stack is empty**. Thanks to JavaScript's **run-to-completion
guarantee**, no running function is interrupted. When the Call Stack is
empty, the Event Loop executes all Microtasks first and then processes
tasks from the Callback Queue.

------------------------------------------------------------------------

## One Sentence to Remember

> **JavaScript executes one function at a time on the Call Stack. Slow
> work is delegated to external systems, completed work waits in queues,
> and the Event Loop moves that work back onto the Call Stack only when
> it is safe to do so.**
