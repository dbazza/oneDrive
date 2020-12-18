/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'One Drive';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Gio   = imports.gi.Gio;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('One Drive'));

        this.statusIcon = new St.Icon({
            icon_name: '',
            style_class: 'disabledIcon',
        }); 

        let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        box.add_child(this.statusIcon);
        box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
        this.add_child(box);

        let menuItemOnOff = new PopupMenu.PopupSwitchMenuItem("Onedrive", this.isOneDriveActive());
        this.menu.addMenuItem(menuItemOnOff);
        menuItemOnOff.statusAreaKey = "Onedrive";

        menuItemOnOff.connect('toggled', this.onOff.bind(this));

        let itemStatus = new PopupMenu.PopupMenuItem(_('Show service status'));
        itemStatus.connect('activate', () => {
            GLib.spawn_command_line_sync(
                'gnome-terminal --tab --title="Status" --command=\"systemctl --user status onedrive\"');
        });
        this.menu.addMenuItem(itemStatus);

        let itemWeb = new PopupMenu.PopupMenuItem(_('Open One Drive web site'));
        itemWeb.connect('activate', () => {
            Gio.AppInfo.launch_default_for_uri('https://onedrive.live.com/', null);
        });
        this.menu.addMenuItem(itemWeb);
        
        let itemFolder = new PopupMenu.PopupMenuItem(_('Open One Drive local folder'));
        itemFolder.connect('activate', () => {
            let [resOnedrive, oneDriveConfig] = GLib.spawn_command_line_sync('onedrive --display-config');
            
            let folder = "";
            let config = oneDriveConfig.toString().split("\n");
            for(let cont=0;cont<config.length;cont++)
            {
                if(config[cont].indexOf("sync_dir") >= 0)
                {
                    folder = (config[cont].split("=")[1]).trim();
                    break;
                }
                
            }

            if(folder === "") Main.notify("One drive 'sync-dir' not found");
            else Gio.AppInfo.launch_default_for_uri("file://" + folder, null);

        });
        this.menu.addMenuItem(itemFolder);
         
        // requirement check
        let problem = false;
        if(!problem && !this.controllaBinario("onedrive")) problem = true;
        if(!problem && !this.controllaBinario("systemctl")) problem = true;
        if(problem) return; 

        // start loop
        this.lastLineStatus = "";
        this._aggiornaLoop = Mainloop.timeout_add(3000, this.aggiorna.bind(this));
    } 

    controllaBinario(bin)
    {
        if(GLib.find_program_in_path(bin) === null)
        {
            Main.notify("I can't find program '" + bin + "'. This extention will not work!");
            return false;
        }

        return true;
    }

    aggiorna() {
        if(this.isOneDriveActive())
        {
            this.statusIcon.set_property("style_class", "activeIcon");
            this.statusIcon.set_property("icon_name", "system-search-symbolic");
            this.statusIcon.set_property("icon_name", "");
            
            let oldlastLineStatus = this.lastLineStatus;
            this.getLastLineStatus();
            if(oldlastLineStatus !== this.lastLineStatus)
            {
                this.statusIcon.set_property("style_class", "workingIcon");
                this.statusIcon.set_property("icon_name", "system-search-symbolic");
                this.statusIcon.set_property("icon_name", ""); 
            } 
        }
        else
        {
            this.statusIcon.set_property("style_class", "disabledIcon");
            this.statusIcon.set_property("icon_name", "system-search-symbolic");
            this.statusIcon.set_property("icon_name", "");
        }
        
        return true;
    }

    isOneDriveActive() {
        let [resOnedrive, outOnedrive] = GLib.spawn_command_line_sync("systemctl --user is-active onedrive");
        let outOnedriveString = outOnedrive.toString().replace(/(\r\n|\n|\r)/gm,"");
        
        return outOnedriveString == "active";
    }

    getLastLineStatus() {

        let [resOnedrive, outOnedrive] = GLib.spawn_command_line_sync("systemctl --user status onedrive");
        let status = outOnedrive.toString().split("\n");
        
        this.lastLineStatus = status[status.length -2];
    } 

    onOff() {
        let result = this.isOneDriveActive();
        
        if(result) {
            let [resOnedrive, outOnedrive] = GLib.spawn_command_line_sync("systemctl --user stop onedrive");
        }
        else {
            let [resOnedrive, outOnedrive] = GLib.spawn_command_line_sync("systemctl --user start onedrive");
        }
        
        this.aggiorna();
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {

        Mainloop.source_remove(this._aggiornaLoop);

        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

