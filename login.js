#!/usr/bin/gjs

imports.gi.versions.Gtk = '3.0';

const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const WebKit = imports.gi.WebKit2;
const Mainloop = imports.mainloop;

const Lang = imports.lang;

Gtk.init(null);

const WebBrowser = new Lang.Class({
    Name: 'WebBrowser',
    Extends: Gtk.Application,

    // Create the application itself
    _init: function () {
        this.parent({
            application_id: 'OneDrive.login.WebBrowser'
        });

        this.inFile = "/home/diego/in";
        this.outFile = "/home/diego/out";

        // Connect 'activate' and 'startup' signals to the callback functions
        this.connect('activate', () => this._onActivate())
        this.connect('startup', () => this._onStartup())
    },

    startLogin()
    {
        print('Parte startLogin');
        let url = "";
        try 
        {
            url = String(GLib.file_get_contents(this.inFile)[1]);
            this._homeUrl = url;
            this._webView.load_uri(this._homeUrl);

            this._attendiOut = Mainloop.timeout_add(500, this.endLogin.bind(this));

            return false;
        } 
        catch(ex)
        {
            print('Erroraccio ' + ex.message);
        }

        return true;
    },

    endLogin()
    {
        print('Parte endLogin');

        let url = "";
        try 
        {
            GLib.file_set_contents(this.outFile, "Prova");
            Mainloop.timeout_add(1000, function() { this.quit(); }.bind(this));
        } 
        catch(ex)
        {
            print('Erroraccio ' + ex.message);
        }

        return true;
    },

    // Callback function for 'activate' signal 
    _onActivate: function () {
        // Present window when active
        this._window.present();

        GLib.spawn_command_line_async("onedrive --auth-files " + this.inFile + ":" + this.outFile + " --logout");
        this._attendiIn = Mainloop.timeout_add(5000, this.startLogin.bind(this));
    },

    // Callback function for 'startup' signal
    _onStartup: function () {
        // Build the UI
        this._buildUI();

        // Connect the UI signals
        this._connectSignals();
    },

    // Build the application's UI
    _buildUI: function () {
        // Create the application window
        this._window = new Gtk.ApplicationWindow({
            application: this,
            window_position: Gtk.WindowPosition.CENTER,
            default_height: 768,
            default_width: 1024,
            border_width: 0,
            title: "OneDrive login"
        });

        // Create the WebKit WebView, our window to the web
        this._webView = new WebKit.WebView();

        // Create a scrolled window to embed the WebView
        let scrolledWindow = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
        });
        scrolledWindow.add(this._webView);

        // Create a box to organize everything in
        let box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            homogeneous: false,
            spacing: 0
        });

        // Pack toolbar and scrolled window to the box
        //box.pack_start(toolbar, false, true, 0);
        box.pack_start(scrolledWindow, true, true, 0);

        // Add the box to the window
        this._window.add(box);

        // Show the window and all child widgets
        this._window.show_all();
    },

    _connectSignals: function () {
        
        // Change the Window title when a new page is loaded
        this._webView.connect('notify::title', () => {
            this._window.set_title(this._webView.title);
        });

        // Update the url bar and buttons when a new page is loaded
        this._webView.connect('load_changed', (webView, loadEvent) => {
            if (loadEvent !== WebKit.LoadEvent.COMMITTED) {
                return
            }
            //this._urlBar.text = this._webView.get_uri();
        });
    }
});

// Run the application
let app = new WebBrowser();
app.run(ARGV);