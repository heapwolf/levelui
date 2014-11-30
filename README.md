# STATUS
Work in progress. Contributions welcome.

# SYNOPSIS
A LevelDB GUI based on [`atom-shell`][1]. See also the [`command line version`][0].

# SCREENSHOT
![img](/docs/screenshot1.png)
![img](/docs/screenshot2.png)
![img](/docs/screenshot3.png)

# DEV
You need a build of leveldown suitable for atom-shell.

```
env HOME=~/.atom-shell-gyp node-gyp rebuild --target=0.19.4 --arch=ia64 --dist-url=https://gh-contractor-zcbenz.s3.amazonaws.com/atom-shell/dist
```

[0]:https://github.com/hij1nx/lev
[1]:https://github.com/atom/atom-shell

