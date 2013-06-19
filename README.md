[leveldb](/public/img/leveldb.png)

# SYNOPSIS
A modular LevelDB GUI. See also the [`commandline tool for leveldb`][99].

# DESCRIPTION
Levelweb is a simple modular front end for leveldb. Out of the box it does
the following things.

 - Manage users and permissions
 - Opt-in secure login over HTTP or HTTPS
 - Automaticly reconnect the client to data sources
 - Provide a simple RPC and REST API for creating modules (([`see this example`][98]))

# USAGE

### Installation
Levelweb can be run as a process or used as a module on top of your own 
LevelDB-based database.

```bash
npm install levelweb -g
```

### To use levelweb with the `--auth` option, create an initial user account
Levelweb supports encrypted login over https

```bash
levelweb -u admin -p password -g admin
```

### Connect to a local database 
Levelweb can be a server and accept input from simple tcp, tls or [rpc][0].

```bash
levelweb ./test/data
```

### Connect to a remote database
Levelweb can be a client and connect to a network enabled [Levelup][1] instance.

```bash
levelweb --client 9099 --host 192.168.0.1
```

### Log into the user interface
![screenshot](/screenshots/screenshot0.png)

[0]:https://github.com/juliangruber/multilevel
[1]:https://github.com/rvagg/node-levelup
[98]:https://github.com/hij1nx/levelweb-template
[99]:https://github.com/hij1nx/lev
