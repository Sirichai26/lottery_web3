# mysql-error-codes

A list of error codes in Mysql

## Usage

```bash
$ npm install --save mysql-error-codes
```

### Typescript
```javascript

import { MysqlErrorCodes } from 'mysql-error-codes';

console.log( MysqlErrorCodes.ER_DUP_ENTRY );

```

### Javascript (node)
```javascript

const MysqlErrorCodes = require('mysql-error-codes')

console.log(MysqlErrorCodes.ER_DUP_ENTRY);

```

## License

MIT

[Error Message Reference](https://dev.mysql.com/doc/refman/8.0/en/error-reference.html)