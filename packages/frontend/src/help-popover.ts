export class HelpPopover {
	static id = 'help-popover';
	static show() {
		if (document.getElementById(this.id)) return;
		const pop = document.createElement('div');
		pop.id = this.id;
		pop.style.position = 'fixed';
		pop.style.top = '64px';
		pop.style.right = '64px';
		pop.style.background = 'rgba(24,26,40,0.98)';
		pop.style.color = '#fff';
		pop.style.padding = '24px 32px';
		pop.style.borderRadius = '14px';
		pop.style.boxShadow = '0 4px 32px #000a';
		pop.style.zIndex = '4000';
		pop.style.fontSize = '1.1rem';
		pop.innerHTML = `
			<h2 style='margin-top:0;margin-bottom:1.2em;font-size:1.3em;'>Help & Legend</h2>
			<ul style='list-style:none;padding:0;margin:0;'>
				<li><span style='display:inline-block;width:18px;height:18px;background:#ffe066;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>Yellow Dwarf</li>
				<li><span style='display:inline-block;width:18px;height:18px;background:#ff6666;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>Red Giant</li>
				<li><span style='display:inline-block;width:18px;height:18px;background:#e0e0ff;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>White Dwarf</li>
				<li><span style='display:inline-block;width:18px;height:18px;background:#ccccff;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>Neutron Star</li>
				<li><span style='display:inline-block;width:18px;height:18px;background:#222233;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>Black Hole</li>
				<li><span style='display:inline-block;width:18px;height:18px;background:#66ffcc;border-radius:50%;margin-right:10px;vertical-align:middle;'></span>Multi-Star System</li>
			</ul>
			<hr style='margin:1.5em 0;border:0;border-top:1px solid #333;'>
			<div style='font-size:1em;color:#aaa;'>
				<p><b>Controls:</b></p>
				<ul style='list-style:none;padding:0;margin:0;'>
					<li><b>WASD / Arrow Keys</b>: Move ship</li>
					<li><b>?</b> or <b>/</b>: Toggle this help</li>
					<!-- Add more controls/help here -->
				</ul>
			</div>
		`;
		document.body.appendChild(pop);
	}
	static hide() {
		const pop = document.getElementById(this.id);
		if (pop) pop.remove();
	}
	static toggle() {
		if (document.getElementById(this.id)) {
			this.hide();
		} else {
			this.show();
		}
	}
}
