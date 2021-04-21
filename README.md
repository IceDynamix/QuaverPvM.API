# QuaverPvM API

## API Documentation

Base URL: `none yet lol`

- [QuaverPvM API](#quaverpvm-api)
    - [API Documentation](#api-documentation)
        - [GET `/entities`](#get-entities)
            - [Query string parameters](#query-string-parameters)
        - [GET `/results`](#get-results)
            - [Query string parameters](#query-string-parameters-1)
        - [GET `/datapoints`](#get-datapoints)
            - [Query string parameters](#query-string-parameters-2)

### GET `/entities`

#### Query string parameters

- `id?` (ObjectId)
- `type?` ("user" | "map")
- `qid?` (number) - Search from Quaver ID, best paired with type.

### GET `/results`

#### Query string parameters

- `id?` (ObjectId)
- `entity?` (ObjectId)
- `populate?` (boolean) - Whether to insert entity data directly into the response

### GET `/datapoints`

#### Query string parameters

- `id?` (ObjectId)
- `entity?` (ObjectId)
- `before?` (ISODate)
- `after?` (ISODate)
- `populate?` (boolean) - Whether to insert entity data directly into the response
