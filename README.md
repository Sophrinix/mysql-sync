# mysql-sync

Handling mysql databases with NodeJS had never been a great pleasure, especially when transactions are involved.  This package aims at providing a *natural* way to for NodeJS coders to work with mysql, such that it is comparable to the way how *normal* languages, such as Ruby or Python, are handling relational databases.  Particularly,

* We provide *synced* API, such that no callbacks are ever involved, not even mention all the issues that come along with explicit callback passing style of coding.

* We handle transactions transparently.

* We are trying to be minimalists here.  We do not provide *abundant* (or say, *bloated*) set of APIs that aim at covering all aspects of a common ORM (Object Relation Mapping).  So this is not yet another "model on rails".  Instead, we only provide key APIs that we consider as being mandatory.  We leave further evolvements to potential extensions build upon this package.

* Disclaimer: this architectural design of this package is very opinionated.  It insists certain ways of doing certain things, which we have a strong belief in.

## Use

```javascript
var DBConfig = require('mysql-sync');
```

## APIs

* DBConfig
    * ready
    * getDB
    * executeQuery
    * transaction
    * format
* DB
    * context
* Table
    * create
    * clone
    * update
    * find
    * findOne
    * findById
    * findByFields
    * lockById
    * softDelete
    * remove

For the rest of the presentation, we will use "->" to denote normal function signatures, and use "~>" to denote generator function signatures.

### DBConfig

#### ready: () ~> void

ready is a generator function who makes all necessary preparations for a db configuration object to further operate.  So this is the first thing that must be done once a db configuration object is created.

#### getDB: () -> DB

getDB is a normal function that produces a DB object from a DB Configuration.  You can get multiple DB objects from a DB configuration.  Under the hood, each DB object wraps up a connection pool.

#### executeQuery (query_string) ~> query_results

executeQuery is a generator function that runs a query string and get you the results.

#### transaction (generator_function) ~> results

transaction takes a generator function as input, run it in the context of mysql database transaction, and return the result generated from the transaction.

#### format (query_string_template, [list_of_values]) -> query_string

format is a helper function that splices values into a query string template, in a proper and safe way, to form a executable query string.

#### Example

```javascript

```










