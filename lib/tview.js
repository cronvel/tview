#!/usr/bin/env node
/*
	T-View
	
	Copyright (c) 2017 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var termkit = require( 'terminal-kit' ) ;
var term = termkit.terminal ;
var path = require( 'path' ) ;



var tview = {} ;
module.exports = tview ;



tview.cli = function cli()
{
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	if ( args.h || args.help )
	{
		tview.usage() ;
		process.exit() ;
	}
	else if ( ! args._[ 0 ] )
	{
		tview.usage() ;
		process.exit( 1 ) ;
	}
	
	var url = args._[ 0 ] ;
	var interactiveMode = args.m || args.move ;
	var maxScale = args.s || args.scale || args._[ 1 ] || ( interactiveMode ? 2 : 1 ) ;
	
	if ( ! interactiveMode )
	{
		tview.inlineDraw( url , maxScale ) ;
	}
	else
	{
		tview.interactiveViewer( url , maxScale ) ;
	}
} ;



tview.usage = function usage()
{
	term.bold.magenta( 'T-View' ).dim( ' v%s by Cédric Ronvel\n\n' , require( '../package.json' ).version ) ;
	
	term.blue( "T-View is an image viewer, it can load local files and web URL.\n\n" ) ;
	
	term.magenta( "Usage is: ./%s <file-path | web URL> [<max-scale>] [option1] [option2] [...]\n" , path.basename( process.argv[ 1 ] ) ) ;
	term.gray( "--move , -m    interactively move the image\n" ) ;
	term.gray( "--scale , -s   the image scale relative to the terminal width (e.g. '1' scale to the terminal width)\n" ) ;
	term.gray( "--help , -h    display this help\n" ) ;
	
	term.blue( "\nExample:\n" ) ;
	term.gray( "tview some-image.jpg\n" ) ;
	term.gray( "tview https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg\n" ) ;
	term.gray( "tview -m https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg\n" ) ;
	term.gray( "tview -m -s 3 https://upload.wikimedia.org/wikipedia/commons/1/1e/Stonehenge.jpg\n" ) ;
	
	term( '\n' ) ;
} ;



// Draw inline, without any screenBuffer
tview.inlineDraw = function inlineDraw( url , maxScale )
{
	term.drawImage( url , {
		shrink: {
			width: term.width * maxScale ,
			height: ( term.height - 1 ) * 2 * maxScale
		}
	} ) ;
} ;



const filler = {
	attr: {
		// 8-bit
		color: 'black' ,
		bgColor: 'black' ,
		// 32-bit
		r: 0 ,
		g: 0 ,
		b: 0 ,
		bgR: 0 ,
		bgG: 0 ,
		bgB: 0
	}
} ;



tview.interactiveViewer = function interactiveViewer( url , maxScale )
{
	var screen , image ;

	var SB = term.support['24bitsColors'] ? termkit.ScreenBufferHD : termkit.ScreenBuffer ;
	
	var redraw = () => {
		
		var stats ;
		
		screen.fill( filler ) ;
		image.draw() ;
		stats = screen.draw( { delta: true } ) ;
		//console.error( stats ) ;
	} ;
	
	
	SB.loadImage(
		url ,
		{
			terminal: term ,
			shrink: {
				width: term.width * maxScale ,
				height: ( term.height - 1 ) * 2 * maxScale
			}
		} ,
		( error , image_ ) => {
			
			image = image_ ;
			
			if ( error )
			{
				term.red( "%E\n" , error ) ;
				process.exit( 1 ) ;
			}
			
			screen = SB.create( { dst: term , height: term.height - 1 , noFill: true } ) ;
			screen.y = 2 ;
			
			image.dst = screen ;
			
			term.clear() ;
			term.grabInput() ;
			term.hideCursor() ;

			term.on( 'key' , key => {
				
				var offset , stats ;
				
				switch ( key )
				{
					case 'UP' :
						offset = Math.round( term.height / 20 ) ;
						screen.vScroll( offset , true ) ;	// Perform term.scrollDown()
						image.y += offset ;
						image.draw() ;
						stats = screen.draw( { delta: true } ) ;	// This only redraws new lines on the top
						//console.error( stats ) ;
						break ;
					case 'DOWN' :
						offset = Math.round( term.height / 20 ) ;
						screen.vScroll( - offset , true ) ;	// Perform term.scrollUp()
						image.y += - offset ;
						image.draw() ;
						stats = screen.draw( { delta: true } ) ;	// This only redraws new lines on the bottom
						//console.error( stats ) ;
						break ;
					case 'LEFT' :
						offset = Math.round( term.width / 20 ) ;
						image.x += offset ;
						redraw() ;
						break ;
					case 'RIGHT' :
						offset = Math.round( term.width / 20 ) ;
						image.x -= offset ;
						redraw() ;
						break ;
					case 'q' :
					case 'CTRL_C' :
						tview.terminate() ;
						break ;
				}
			} ) ;
			
			redraw() ;
			term.moveTo( 1 , 1 ).bgWhite.eraseLineAfter() ;
			term.bold.magenta( 'T-View' ).gray( ' v%s by Cédric Ronvel' , require( '../package.json' ).version ) ;
			term.blue( " -- Arrows keys: move   Q/CTRL-C: quit" ) ;
		}
	) ;
} ;



tview.terminate = function terminate()
{
	term.hideCursor( false ) ;
	//term.applicationKeypad( false ) ;
	term.styleReset() ;
	term.resetScrollingRegion() ;
	term.moveTo( term.width , term.height ) ;
	term( '\n' ) ;
	term.processExit() ;
} ;

