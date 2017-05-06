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



var NextGenEvents = require( 'nextgen-events' ) ;
var termkit = require( 'terminal-kit' ) ;
var term = termkit.terminal ;
var path = require( 'path' ) ;



var tview = {} ;
module.exports = tview ;



tview.cli = function cli()
{
	var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
	
	var urls = args._ ;
	
	if ( args.h || args.help )
	{
		tview.usage() ;
		process.exit() ;
	}
	else if ( ! urls.length )
	{
		tview.usage() ;
		process.exit( 1 ) ;
	}
	
	var interactiveMode = args.m || args.move || urls.length > 1 ;
	//var maxScale = args.s || args.scale || ( interactiveMode ? 2 : 1 ) ;
	var maxScale = args.s || args.scale || 1 ;
	
	if ( ! interactiveMode )
	{
		tview.inlineDraw( urls[ 0 ] , maxScale ) ;
	}
	else
	{
		tview.interactiveViewer( urls , maxScale ) ;
	}
} ;



tview.usage = function usage()
{
	term.bold.magenta( 'T-View' ).dim( ' v%s by Cédric Ronvel\n\n' , require( '../package.json' ).version ) ;
	
	term.blue( "T-View is an image viewer, that can load local files as well as web URL.\n\n" ) ;
	
	term.magenta( "Usage is: ./%s <file-path | web URL> [url2] [...] [option1] [option2] [...]\n" , path.basename( process.argv[ 1 ] ) ) ;
	
	term.magenta( "\nOptions:\n" ) ;
	term.gray( "--move , -m    interactively move the image around\n" ) ;
	term.gray( "--scale , -s   scale relative to the terminal size (e.g.: '1' fits the terminal)\n" ) ;
	term.gray( "--help , -h    display this help\n" ) ;
	
	term.blue( "\nExamples:\n" ) ;
	term.gray( "tview some-image.jpg\n" ) ;
	term.gray( "tview some-image.jpg another-image.jpg\n" ) ;
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
		} ,
		( error ) => {
			if ( error )
			{
				if ( error.code === 'ENOENT' ) { term.red( "File %s not found\n" , url ) ; }
				else if ( error.code === 'ENOTFOUND' ) { term.red( "URL %s not found\n" , url ) ; }
				else { term.red( "%s\n" , error.message ) ; }
				process.exit( 1 ) ;
			}
		}
	) ;
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



tview.interactiveViewer = function interactiveViewer( urls , maxScale )
{
	var screen , index , ready = false , freeze = false ,
		images = new Array( urls.length ) ,
		events = new NextGenEvents() ,
		SB = term.support['24bitsColors'] ? termkit.ScreenBufferHD : termkit.ScreenBuffer ;
	
	
	screen = SB.create( { dst: term , height: term.height - 1 , noFill: true } ) ;
	screen.y = 2 ;
	
	
	events.once( 'ready' , ( index_ ) => {
		
		term.clear() ;
		term.grabInput() ;
		term.hideCursor() ;
		
		term.moveTo( 1 , 1 ).bgWhite.eraseLineAfter() ;
		term.bold.magenta( 'T-View' ).gray( ' v%s' , require( '../package.json' ).version ) ;
		term.blue( "  ←↑↓→ move  +/- zoom  space/backspace next/prev.  Q/ESC/Ctrl-C quit" ) ;
		
		index = index_ ;
		
		term.on( 'key' , onKey ) ;
		
		redraw() ;
	} ) ;
	
	
	events.once( 'finishedLoading' , () => {
		
		if ( ! ready )
		{
			term.red( "Cannot load any images\n" ) ;
			process.exit( 1 ) ;
		}
	} ) ;
	
	
	var redraw = () => {
		
		var stats ;
		
		screen.fill( filler ) ;
		images[ index ].draw() ;
		stats = screen.draw( { delta: true } ) ;
		//console.error( stats ) ;
	} ;
	
	
	var loadLoop = ( index_ ) => {
		
		if ( index_ >= urls.length )
		{
			events.emit( 'finishedLoading' ) ;
			return ;
		}
		
		SB.loadImage(
			urls[ index_ ] ,
			{
				terminal: term ,
				shrink: {
					width: term.width * maxScale ,
					height: ( term.height - 1 ) * 2 * maxScale
				}
			} ,
			( error , image_ ) => {
				
				if ( error )
				{
					if ( urls.length === 1 )
					{
						term.red( "%E\n" , error ) ;
						process.exit( 1 ) ;
					}
					
					images[ index_ ] = null ;
					events.emit( 'load' , index_ ) ;
					loadLoop( index_ + 1 ) ;
					return ;
				}
				
				image_.dst = screen ;
				image_.maxScale = maxScale ;
				image_.x = ( screen.width - image_.width ) / 2 ;
				image_.y = ( screen.height - image_.height ) / 2 ;
				
				images[ index_ ] = image_ ;
				
				if ( ! ready )
				{
					ready = true ;
					events.emit( 'ready' , index_ ) ;
				}
				
				events.emit( 'load' , index_ ) ;
				loadLoop( index_ + 1 ) ;
			}
		) ;
	} ;
	
	
	var nextImage = () => {
		
		var onLoad = ( index_ ) => {
			 if ( index_ !== index ) { return ; }
			 
			 events.off( 'load' , onLoad ) ;
			 freeze = false ;
			 
			 if ( images[ index ] ) { redraw() ; }
			 else { nextImage() ; }
		} ;
		
		while ( true )
		{
			index ++ ;
			if ( index >= images.length ) { index = 0 ; }
			
			if ( images[ index ] ) { break ; }
			
			if ( images[ index ] === undefined )
			{
				// Image is not loaded yet
				freeze = true ;
				events.on( 'load' , onLoad ) ;
				return ;
			}
		}
		
		redraw() ;
	} ;
	
	
	var previousImage = () => {
		
		var onLoad = ( index_ ) => {
			 if ( index_ !== index ) { return ; }
			 
			 events.off( 'load' , onLoad ) ;
			 freeze = false ;
			 
			 if ( images[ index ] ) { redraw() ; }
			 else { previousImage() ; }
		} ;
		
		while ( true )
		{
			index -- ;
			if ( index < 0 ) { index = images.length - 1 ; }
			
			if ( images[ index ] ) { break ; }
			
			if ( images[ index ] === undefined )
			{
				// Image is not loaded yet
				freeze = true ;
				events.on( 'load' , onLoad ) ;
				return ;
			}
		}
		
		redraw() ;
	} ;
	
	
	var rescale = ( index_ , maxScale_ ) => {
		
		freeze = true ;
		
		SB.loadImage(
			urls[ index_ ] ,
			{
				terminal: term ,
				shrink: {
					width: term.width * maxScale_ ,
					height: ( term.height - 1 ) * 2 * maxScale_
				}
			} ,
			( error , newImage ) => {
				freeze = false ;
				if ( error ) { return ; }
				
				var oldImage = images[ index_ ] ;
				
				//newImage.x = Math.round( oldImage.x + ( oldImage.width - newImage.width ) / 2 ) ;
				//newImage.y = Math.round( oldImage.y + ( oldImage.height - newImage.height ) / 2 ) ;
				
				newImage.x = ( oldImage.x - screen.width / 2 ) * newImage.width / oldImage.width + screen.width / 2 ;
				newImage.y = ( oldImage.y - screen.height / 2 ) * newImage.height / oldImage.height + screen.height / 2 ;
				
				newImage.maxScale = maxScale_ ;
				newImage.dst = screen ;
				
				images[ index_ ] = newImage ;
				
				redraw() ;
			}
		) ;
	} ;
	
	
	var onKey = ( key ) => {
		
		var offset , stats ;
		
		switch ( key )
		{
			case 'UP' :
				if ( freeze ) { return ; }
				offset = Math.round( term.height / 20 ) ;
				screen.vScroll( offset , true ) ;	// Perform term.scrollDown()
				images[ index ].y += offset ;
				images[ index ].draw() ;
				stats = screen.draw( { delta: true } ) ;	// This only redraws new lines on the top
				//console.error( stats ) ;
				break ;
			case 'DOWN' :
				if ( freeze ) { return ; }
				offset = Math.round( term.height / 20 ) ;
				screen.vScroll( - offset , true ) ;	// Perform term.scrollUp()
				images[ index ].y += - offset ;
				images[ index ].draw() ;
				stats = screen.draw( { delta: true } ) ;	// This only redraws new lines on the bottom
				//console.error( stats ) ;
				break ;
			case 'LEFT' :
				if ( freeze ) { return ; }
				offset = Math.round( term.width / 20 ) ;
				images[ index ].x += offset ;
				redraw() ;
				break ;
			case 'RIGHT' :
				if ( freeze ) { return ; }
				offset = Math.round( term.width / 20 ) ;
				images[ index ].x -= offset ;
				redraw() ;
				break ;
			case ' ' :
				if ( freeze ) { return ; }
				nextImage() ;
				break ;
			case 'BACKSPACE' :
				if ( freeze ) { return ; }
				previousImage() ;
				break ;
			case '+' :
				if ( freeze ) { return ; }
				rescale( index , images[ index ].maxScale * 1.5 ) ;
				break ;
			case '-' :
				if ( freeze ) { return ; }
				rescale( index , images[ index ].maxScale / 1.5 ) ;
				break ;
			case 'q' :
			case 'ESCAPE' :
			case 'CTRL_C' :
				tview.terminate() ;
				break ;
		}
	} ;
	
	
	loadLoop( 0 ) ;
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


