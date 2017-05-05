

# T-View: Open image inside the terminal!

T-View is an image viewer, that can load local files as well as web URL.
Proudly powered by [Terminal-kit](https://www.npmjs.com/package/terminal-kit).


Usage is: `./tview <file-path | web URL> [<max-scale>] [option1] [option2] [...]`
Options:
	--move , -m    interactively move the image
	--scale , -s   the image scale relative to the terminal width (e.g. '1' scale to the terminal width)
	--help , -h    display this help


Examples:

* `tview some-image.jpg`
* `tview https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg`
* `tview -m https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg`
* `tview -m -s 3 https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg`

If your terminal supports true colors, this would produce something like this:

![True color example](example1.jpg)

If your terminal doesn't support true colors, the closest color in the available palette is used.
Example with a 256 colors terminal:

![256 colors example](example2.jpg)

