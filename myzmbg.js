/********** myzmbg.js **********
Make a wallpaper for computing device background
Inspiration memo: https://twitter.com/CTNNB1_3p22/status/1411544249821110275
iPhone 12 mini's resolution: 2340 x 1080 pixels
*/
const cvs = document.querySelector('canvas');
const c = cvs.getContext('2d');
debug = document.getElementById("debug");//points to <p> element on HTML created for debug outputs

/****** global static and dynamic parameters ******/
//user-set parameters are for display only b/c they will be immediately overwritten by the default or user-entered values from HTML. The key here is to make them global variables.
///frame and triangle scale
scale = 0.25;
crop_wu = 1080;
crop_hu = 2340;
triangle_wu = 138.6;
triangle_hu = 120;//unit length (px) of the triangle height

///triangle color parameters
color_above = [65,125,112,0.1];
color_below = [0,80,131,0.8];
color_noise = [65,175,112];
maxmixratio = 0.25;
/*
basecolor = [8,103,118];
mixcolors = [[0,0,0],[255,100,100]];
color = color_mix(basecolor,mixcolors,0.2);
*/

///triangle transparency parameters
transpcap_prop = 0.45; //the positional threshold of triangles to turn 50% semi-transparent on average. 0 = at top = most are not semi-transparent, 1 = at bottom = mostly semi-transparent.
alpha_atan_compress = 50; //the spreading of triangles' positions to turn semi-transparent. Large = narrow (sudden) transition, Small = broad (gradual) transition.
alpha_rand_range = 10; //the spreading of transparentness at a given position. Small = mostly similar, Large = very different. 

///logo parameters
logo_y_prop = 0.25;
logo_r_prop = 0.8;
logo_alpha = 0.3;

///number matrix parameters
color_letters="239,255,61";
line_ht = 36*scale;
n_lines = 0;
n_letters =0;
nummatr = null;
cluster_locs = null;

//calculated parameters - initially set to nonsense value, then setScale() executed within main()
crop_w = 0;
crop_h = 0;
triangle_h = 0;
triangle_w = 0;
cvs.width = 0;
cvs.height = 0;

//objects - initialized in initialize(), then updated in animate()
tiles = null;
bargraph = null;

/*function toggle_modetext(){
	modetext = document.getElementById('modetext'); 
	modetext.innerHTML = (modeCx.checked)?"play":"stop";
	modetext.style.color = (modeCx.checked)?"#2196F3":"#999";
}*/

function setScale(){
	crop_w = crop_wu*scale;
	crop_h = crop_hu*scale;
	triangle_h = triangle_hu*scale;
	triangle_w = triangle_wu*scale;
	cvs.width = crop_w + triangle_w*2;
	cvs.height =crop_h + triangle_h*2;
}

class Circle{//borrowed from canvas.js for test purpose only
	constructor(x,y,r,fillStyle){
		this.x=x;
		this.y=y;
		this.r=r;
		this.fillStyle=fillStyle;
	}
	draw = () => {
		c.save();
	    c.fillStyle = this.fillStyle;
	    c.beginPath();
		c.arc(this.x, this.y,
			this.r,
			0, Math.PI * 2, false
		); 
		c.closePath();
		c.fill();
		c.restore();
	}
}

class IsoscelesTriangle {
	constructor(x,y,w,h,a,fc){
	/*
	(x,y) = coordinates at the center of the 3rd edge (=the edge that is not necessarily the same length as the other 2)
	(w,h) = width of the 3rd edge (the edge that is not necessarily the same length as the other 2), height (the distance between the 3rd edge and its opposite vertex)
	a = angle (0 = the angle between 2 equally long edges pointing up; 90 = pointing right; 180 = pointing down, etc)
	fc = fill color, styled like "225,225,225"
	*/
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.a = a;
		this.fc = 'rgba('+fc+')';
		
		this.x_1 = this.x - (this.w/2 * Math.cos(this.a/180*Math.PI));
		this.y_1 = this.y - (this.w/2 * Math.sin(this.a/180*Math.PI));
		this.x_2 = this.x + (this.w/2 * Math.cos(this.a/180*Math.PI));
		this.y_2 = this.y + (this.w/2 * Math.sin(this.a/180*Math.PI));
		this.x_3 = this.x + (this.h * Math.sin(this.a/180*Math.PI));
		this.y_3 = this.y - (this.h * Math.cos(this.a/180*Math.PI));
		/*
		debug.innerHTML += "<br>x,y = "+this.x+", "+this.y;
		debug.innerHTML += "<br>w,h = "+this.w+", "+this.h;
		debug.innerHTML += "<br>a = "+this.a;
		debug.innerHTML += "<br>fc = "+this.fc;
		debug.innerHTML += "<br>vertex1 = "+this.x_1+", "+this.y_1;
		debug.innerHTML += "<br>vertex2 = "+this.x_2+", "+this.y_2;
		debug.innerHTML += "<br>vertex3 = "+this.x_3+", "+this.y_3;
		*/
	}
	draw = () =>{
		c.save();
	    c.fillStyle = this.fc;
		c.beginPath();
		c.moveTo(this.x_1,this.y_1);
		c.lineTo(this.x_2,this.y_2);
		c.lineTo(this.x_3,this.y_3);
		c.closePath();
		c.fill();
		c.restore();
	}
}

class IsosTiles {
	/*
	Make a tile of isosceles triangles in "triforce" style
	*/
	constructor(
		os_x,os_y,
		w,h,a,
		basecolor_grad,noisecolors,maxmixratio
	){
		/*
		(os_x, os_y) = offset x & y on which to plant the top-left-most (x,y) of IsoscelesTriangle()
		(w,h) = width, height - defn is the same as in IsoscelesTriangle
		(NOT NOW: a = angle of tilt, in degrees)
		basecolor = the overall theme color, in [225,225,225] style. Will be concatenated into a comma-separated text after calculation.
		noisecolors = an array of 3-member integer array colors in whose direction each triangle will randomly deviate away from basecolor in a Gaussian distribution.
		*/
		this.w = w;
		this.h = h;
		this.a = a;
		this.basecolor_grad = basecolor_grad;
		this.noisecolors = noisecolors;
		this.maxmixratio = maxmixratio;

		this.line_oss = find_all_crossing_lines(
			os_x,os_y,
			this.w,this.h,
			this.a,
			cvs.width,cvs.height
		);
		
		this.xyn = new Array(this.line_oss.length);
		this.coords = [];//an array of array of arrays
		this.colormix_at_coords = [];//an array of array of arrays, first 2 dims same as this.coords, 3rd dim containing color_mix(...) outputs. Meant to allow recovery of randomly generated colors and transparencies.	
		for(let i=0; i<this.line_oss.length; i++){
			//debug.innerHTML += "<br>seed coordinate: "+this.line_oss[i][0]+","+this.line_oss[i][1];
			this.xyn[i] = origins_spanning_crosses(
				this.line_oss[i][0],this.line_oss[i][1],
				this.w,this.h,
				this.a,
				cvs.width,cvs.height
			);
			//debug.innerHTML += "<br>origin & #: "+this.xyn[i];
			this.coords[i] = expand_coords(this.xyn[i], this.w, this.a);
			//debug.innerHTML += "<br>generated coords: "+this.coords[i];
			this.colormix_at_coords[i] = Array(this.coords[i].length);
		}
		//debug.innerHTML += "<br>at generation, colormix_at_coords has "+this.colormix_at_coords.length+" rows.";
	}
	copy_old_colormix = (tri_colormix_old_string) =>{
		///de-stringify and copy old colormix if the first 2 dimensions of tri_colormix_old is the same as those of this.colormix_at_coords. Do nothing if different.
		let colormix_old = JSON.parse(tri_colormix_old_string);
		/*
		debug.innerHTML += "<br>in old colormix,";
		for(let i=0; i<colormix_old.length; i++){
			debug.innerHTML += "<br> row i="+i+" has "+colormix_old[i].length+" columns";
		}
		debug.innerHTML += "<br>in new colormix,";
		for(let i=0; i<this.colormix_at_coords.length; i++){
			debug.innerHTML += "<br> row i="+i+" has "+this.colormix_at_coords[i].length+" columns";
		}
		*/
		///check for dimension discrepancy, then copy
		if(colormix_old.length != this.colormix_at_coords.length){
			//debug.innerHTML += "<br>colormix #rows mismatch: old "+colormix_old.length+", new "+this.colormix_at_coords.length;
			return;
		}
		for(let i=0; i<this.colormix_at_coords.length; i++){
			if(colormix_old[i].length != this.colormix_at_coords[i].length){
				//debug.innerHTML += "<br>colormix #cols mismatch: old "+colormix_old[i].length+", new "+this.colormix_at_coords[i].length;
				return;
			}
		}
		//debug.innerHTML += "<br>passing old colormix to new tiles";
		this.colormix_at_coords = colormix_old;
	}
	draw = () =>{
		//debug.innerHTML += "<br> current nrows #i = "+this.coords.length;
		for(let i=0; i<this.coords.length; i++){
			for(let j=0; j<this.coords[i].length; j++){
				//NOT TO SELF: omitting "let" breaks the program
				let x = this.coords[i][j][0];
				let y = this.coords[i][j][1];
				
				let xy_pos_prop = (y-triangle_h) / crop_h;
				//debug.innerHTML += "<br>xy_pos_prop: "+Math.round(xy_pos_prop*100)/100;
				
				let basecolor = color_on_grad(x, y, triangle_w, triangle_h, crop_w, crop_h, this.a+90, this.basecolor_grad);
				
				if(typeof this.colormix_at_coords[i][j] === "undefined"){//if not previously assigned
					this.colormix_at_coords[i][j] = Array(2);
				}
				//debug.innerHTML += "<br>at i,j = "+i+","+j;
				//debug.innerHTML += "<br>new array element of this.colormix_at_coords has content "+this.colormix_at_coords[i][j][0];

				let colormix_obj = {};
				let alpha = 0;

				//determine color & alpha for an upward-facing triangle
				if(typeof this.colormix_at_coords[i][j][0] === "undefined"){
					colormix_obj = color_mix(basecolor,this.noisecolors,this.maxmixratio);
					//let color = colormix_obj.color;
					//add the alpha dimension to the color
					alpha = Math.atan((xy_pos_prop - transpcap_prop)*alpha_atan_compress + (Math.random()-0.5)*alpha_rand_range)/Math.PI+0.5;
					colormix_obj.color.push(alpha);
					//debug.innerHTML += "<br>transparency "+Math.round(alpha*100)/100;
				}
				else{
					//debug.innerHTML += "<br>inheriting colormix on upward-facing tr"
					colormix_obj = color_mix(
						basecolor,this.noisecolors,this.maxmixratio,
						this.colormix_at_coords[i][j][0].proportion,
						this.colormix_at_coords[i][j][0].mixratio_norm
					);
					colormix_obj.color.push(this.colormix_at_coords[i][j][0].color[3]); 
				}
				this.colormix_at_coords[i][j][0]=colormix_obj;
				//debug.innerHTML += "<br>colormix color of upward tri is "+this.colormix_at_coords[i][j][0].color;
				//draw the upward-facing triangle
				let tri = new IsoscelesTriangle(x,y,this.w,this.h,this.a,colormix_obj.color.join());//"8,103,118"
				tri.draw();

				//determine color & alpha for a downward-facing triangle
				//debug.innerHTML += "<br>"+basecolor;
				if(typeof this.colormix_at_coords[i][j][1] === "undefined"){
					colormix_obj = color_mix(basecolor,this.noisecolors,this.maxmixratio);
					//color = colormix_obj.color
					alpha = Math.atan((xy_pos_prop - transpcap_prop)*alpha_atan_compress + (Math.random()-0.5)*alpha_rand_range)/Math.PI+0.5;
					colormix_obj.color.push(alpha);
					//debug.innerHTML += "<br>transparency "+Math.round(alpha*100)/100;
				}
				else{
					//debug.innerHTML += "<br>inheriting colormix on downward-facing tr"
					colormix_obj = color_mix(
						basecolor,this.noisecolors,this.maxmixratio,
						this.colormix_at_coords[i][j][1].proportion,
						this.colormix_at_coords[i][j][1].mixratio_norm
					);
					colormix_obj.color.push(this.colormix_at_coords[i][j][1].color[3]); 
				}
				this.colormix_at_coords[i][j][1]=colormix_obj;
				//debug.innerHTML += "<br>colormix color of downward tri is "+this.colormix_at_coords[i][j][1].color;
				//draw the downward-facing triangle
				tri = new IsoscelesTriangle(x,y,this.w,this.h,this.a+180,colormix_obj.color.join());
				tri.draw();
				
			}
		}
		document.getElementById("tri_colormix_old").value = JSON.stringify(this.colormix_at_coords);
	}
}

function slope_crosses_box(os_x,os_y,can_w,can_h,a){
	/*
	find out if the row of os_x and  os_y will ever cross the canvas frame of can_w width and can_h height.
	get the intersection between (the straight line that goes through (os_x,os_y) with slope of a) and (the vertical lines with x = 0 or x = can_w)
	return 0 if crosses the bounding box defined by (0,0),(can_w,0),(can_w,can_h),(0,can_h); -1 if stays above it; 1 if stays below it
	
	BUG ALERT: this code is not compatible with a = 90 yet!!!!!	
	*/
	if(a % 180 != 90){
		y_at_xlt = -os_x * Math.tan(a/180*Math.PI) + os_y;
		y_at_xrt = (can_w - os_x) * Math.tan(a/180*Math.PI) + os_y;
		y_min = Math.min(y_at_xlt,y_at_xrt);
		y_max = Math.max(y_at_xlt,y_at_xrt);
		if(y_max < 0){return -1;}
		else if (y_min > can_h){return 1;}
		else{return 0;}
	}
	else{//in case of vertical line, the defn of 1 and -1 is altered in order to fit the find_crossing_os(...) function.
		if(os_x < 0){return 1;}
		else if(os_x > can_w){return -1;}
		else{return 0;}
	}
}

function find_all_crossing_lines(os_x,os_y,w,h,a,can_w,can_h){
	/*
	os stands for offset.
	First, it moves os_x and os_y upward or downward until finding a line that does cross the bounding box 
	if not crossing, determine which way (+ or -) in vertical direction to walk until finding an origin that does.
	Then, it uses this new (os_x, os_y), which is guaranteed to cross the bounding box, to find all its neighboring lines that cross the bounding box.
	*/
	cross = slope_crosses_box(os_x,os_y,can_w,can_h,a);
	i = 0;
	while(cross != 0){
		i = i+1;
		os_x = os_x + cross * h * Math.sin(a/180*Math.PI) + w/2 * Math.cos(a/180*Math.PI);
		os_y = os_y - cross * h * Math.cos(a/180*Math.PI) + w/2 * Math.sin(a/180*Math.PI);
		cross = slope_crosses_box(os_x,os_y,can_w,can_h,a);
	}
	//using this new set of (os_x,os_y) to find all lines that cross the bounding box.
	oss = [];
	oss.push([os_x,os_y]);
	//debug.innerHTML += "<br>added "+os_x+","+os_y+", now oss is "+oss;
	///go in one direction
	cross = 0;
	i = 0;
	while(cross == 0){
		i =i+1;
		os_x = os_x + h * Math.sin(a/180*Math.PI) + w/2 * Math.cos(a/180*Math.PI);
		os_y = os_y - h * Math.cos(a/180*Math.PI) + w/2 * Math.sin(a/180*Math.PI);
		cross = slope_crosses_box(os_x,os_y,can_w,can_h,a);
		oss.push([os_x,os_y]);
		//debug.innerHTML += "<br>go in one direction: added "+os_x+","+os_y;//+", now oss is "+oss;
	}
	///go in the other direction
	os_x = oss[0][0];
	os_y = oss[0][1];
	cross = 0;
	i = 0;
	while(cross == 0){
		i = i+1;
		os_x = os_x - h * Math.sin(a/180*Math.PI) + w/2 * Math.cos(a/180*Math.PI);
		os_y = os_y + h * Math.cos(a/180*Math.PI) + w/2 * Math.sin(a/180*Math.PI);
		cross = slope_crosses_box(os_x,os_y,can_w,can_h,a);
		oss.push([os_x,os_y]);
		//debug.innerHTML += "<br>go in the other direction: added "+os_x+","+os_y;//+", now oss is "+oss;
	}
	return oss;
}

function origins_spanning_crosses(os_x,os_y,w,h,a,can_w,can_h){
	/*
	presumption: os_x and os_y are offsets that crosses the box.
	if presumption is not fulfilled, returns [x,y,n] =[os_x,os_y,0].

	for a given line through (os_x,os_y) with inclination a,
	returns an array [x,y,n]
	x = the left offset x immediately and strictly outside of the bounding box with width w & height h
	y = the offset y corresponding to the offset x
	n = # of total offsets to create so as to cover the bounding box and immediately and strictly outside 
	*/
	cross = slope_crosses_box(os_x,os_y,can_w,can_h,a);
	if(cross != 0){return [os_x,os_y,0];}

	//get the 2 intersecting points of the line of inclination going through os_x,os_y w/ slope a vs. the bounding box.
	if(a % 180 != 90){
		y_at_xlt = -os_x * Math.tan(a/180*Math.PI) + os_y;
		if(y_at_xlt >= 0 & y_at_xlt <= h){
			//calculate the closest origin
			nmove = Math.floor(-os_x / (w * Math.cos(a/180*Math.PI)));
		}
		else if(Math.tan(a/180*Math.PI)>0){
			x_at_ytop = -os_y / Math.tan(a/180*Math.PI) + os_x;
			nmove = Math.floor((x_at_ytop - os_x) / (w * Math.cos(a/180*Math.PI)));
		}
		else if(Math.tan(a/180*Math.PI)<0){
			x_at_ybot = (h - os_y) / Math.tan(a/180*Math.PI) + os_x;
			nmove = Math.floor((x_at_ybot-os_x) / (w * Math.cos(a/180*Math.PI)));
		}
		else{//when slope == 0
			nmove = Math.floor(-os_x / w)
		}
		x = os_x + nmove * w * Math.cos(a/180*Math.PI);
		y = os_y + nmove * w * Math.sin(a/180*Math.PI);
		intersects = [x,y];
		n = 0;
		do{
			x = x + w * Math.cos(a/180*Math.PI);
			y = y + w * Math.sin(a/180*Math.PI);
			n = n + 1;
		}while(x>=0 & x<=can_w & y>=0 & y<=can_h);
		intersects.push(n);
		return intersects;
	}
	else{//special case of vertical line
		x = os_x;
		y = os_y - Math.ceil(os_y / w) * w;
		n = Math.ceil((can_h - y) / w);
		return [x,y,n];
	}
}

function expand_coords(xyn,w,a){
	/*
	returns an array of [x,y] coordinates from...
	xyn = [offset_x, offset_y, #_of_coords_to_generate], typically an output of origins_spanning_crosses(...)
	w = space between each coord
	a = angle of inclination in degrees.
	*/
	coords = [];
	for(i=0; i<xyn[2]; i++){
		x = xyn[0] + i * w * Math.cos(a/180*Math.PI);
		y = xyn[1] + i * w * Math.sin(a/180*Math.PI);
		coords.push([x,y]);
	}
	return coords;
}

class BarGraph {
	/*draws a vertical, upward oriented bar graph*/
	constructor(orig_x, orig_y, bar_w, bar_s, h_array, fillStyle, alpha){
		this.orig_x = orig_x; //x-coord of bottom left corner
		this.orig_y = orig_y; //y-coord of bottom left corner
		this.bar_w = bar_w; //bar width
		this.bar_s = bar_s; //bar space width
		this.h_array = h_array; //array of heights
		this.fillStyle = fillStyle; //color
		this.alpha = alpha; //transparency
	}
	draw = () => {
		c.save();
		c.globalAlpha = this.alpha;
	    c.fillStyle = "rgb("+this.fillStyle.join()+")";
		//debug.innerHTML += "<br>"+c.fillStyle;
	    for(let i=0; i<this.h_array.length; i++){
			//debug.innerHTML += "<br>"+i;
	    	let topleft_x = this.orig_x + i * (this.bar_w + this.bar_s);
	    	let topleft_y = this.orig_y - this.h_array[i];
			//debug.innerHTML += "<br>x,y = "+topleft_x+", "+topleft_y;
		    c.fillRect(
		    	topleft_x, topleft_y, this.bar_w, this.h_array[i]
		    );
	    }
		c.restore();
	}
}

function color_on_grad(x, y, min_x, min_y, w, h, a, basecolor_grad){
	/*
	Returns a color at coord (x,y) in the gradient positioned in a bounding box with top left corner at (min_x, min_y) and with width w, height h, and tilt angle a. basecolor_grad is assumed to have 2 arrays of 3, with the first one corresponding to the color closer to the top left corner and the second one to the color farther from the corner.
	
	With given angle a, the (min_x, min_y) and its opposite corners are designated to be the 0% and 100% points of the gradient. Basecolor_grad[0][3]-th % position from the (min_x, min_y) corner gets a pure color of RGB = basecolor_grad[0][0-2] and the basecolor_grad[1][3]-th % position gets RGB = basecolor_grad[1][0-2] respectively.
	a = 0 means vertical gradient, a=90 means horizontal gradient.
	*/
	//debug.innerHTML += "<br>"+x+" "+y+" "+min_x+" "+min_y+" "+w+" "+h+" "+a+" "+basecolor_grad;
	a_radian = a/180*Math.PI;
	box_angle = Math.atan(w/h);
	box_diago_length = Math.sqrt(Math.pow(w,2)+Math.pow(h,2));
	grad_dist_x = w + box_diago_length * Math.cos(a_radian + box_angle) * Math.sin(a_radian);
	grad_dist_y = h - box_diago_length * Math.cos(a_radian + box_angle) * Math.cos(a_radian);
	grad_dist_length = Math.sqrt(Math.pow(grad_dist_x,2)+Math.pow(grad_dist_y,2));
	
	xy_angle = Math.atan((x-min_x)/(y-min_y));
	xy_diago_length = Math.sqrt(Math.pow(x-min_x,2)+Math.pow(y-min_y,2));
	xy_grad_dist = xy_diago_length * Math.sin(a_radian + xy_angle);
	
	grad_dist_ratio = xy_grad_dist / grad_dist_length;
	color = [0,0,0];
	for(let co=0; co<=2; co++){
		if(grad_dist_ratio < parseFloat(basecolor_grad[0][3])){
			color[co] = basecolor_grad[0][co];
		}
		else if(grad_dist_ratio > parseFloat(basecolor_grad[1][3])){
			//NOTE TO SELF: using a "=>" comparison breaks the code
			color[co] = basecolor_grad[1][co];
		}
		else{
			dist_0toxy = (grad_dist_ratio - basecolor_grad[0][3])
			dist_xyto1 = (basecolor_grad[1][3] - grad_dist_ratio)
			color[co] = basecolor_grad[0][co] * (dist_xyto1 / (dist_0toxy + dist_xyto1)) + basecolor_grad[1][co] * (dist_0toxy / (dist_0toxy + dist_xyto1));
		}
	}
	return color;
}

function color_mix(basecolor,mixcolors,maxmixratio, proportion=undefined, mixratio_norm=undefined){
	let sumprop = 0;
	if(typeof proportion === "undefined" || proportion.length != mixcolors.length){
		proportion = new Array(mixcolors.length);
		for(let i=0;i<mixcolors.length;i++){
			proportion[i] = Math.random();
			sumprop = sumprop + proportion[i];
		}
		for(let i=0;i<mixcolors.length;i++){
			proportion[i] = proportion[i]/sumprop;
		}
		//debug.innerHTML += "<br> proportion is "+proportion;
	}
	sumprop = 0;
	if(typeof mixratio_norm === "undefined"){
		mixratio_norm = Math.random();
	}
	mixratio = mixratio_norm * maxmixratio;
	//debug.innerHTML += "<br>mixratio: "+mixratio;
	color = [0,0,0];
	for(let c=0; c<=2; c++){
		color[c] = basecolor[c]*(1-mixratio);
		//debug.innerHTML += "<br>"+c+"-th dimension: starts "+color[c];
		for(let i=0;i<mixcolors.length;i++){
			//debug.innerHTML += "<br>adding "+mixcolors[i][c]+" * "+mixratio+" * "+proportion[i]+" = "+(mixcolors[i][c] * mixratio * proportion[i]);
			color[c] = color[c] + mixcolors[i][c] * mixratio * proportion[i];
			//debug.innerHTML += "<br>"+color[c];
		}
		color[c] = Math.round(color[c]);
		//debug.innerHTML += "<br>rounded: "+color[c];
	}
	//debug.innerHTML += "<br>rounded: "+color;
	//return color;
	return {proportion, mixratio_norm, color};
}

function surroundings(seed_loc,n_rows,n_cols){
	//debug.innerHTML += "<br>defining surroundings";
	let surr = new Array();
	for(let r=seed_loc[0]-1; r<=seed_loc[0]+1; r++){
		//if(r<0 || r>=n_rows){continue;}
		for(let c=seed_loc[1]-1; c<=seed_loc[1]+1; c++){
			//if(c<0 || c>=n_cols){continue;}
			//debug.innerHTML += "<br>trying r,c = "+r+","+c;
			if(r==seed_loc[0] && c==seed_loc[1]){continue;}
			//debug.innerHTML += "<br>push it";
			surr.push([r,c]);
		}
	}
	return surr;
}
function define_rim(cluster_locs,n_rows,n_cols){
	//debug.innerHTML += "<br>defining rim for cluster "+cluster_locs;
	let rim = new Array(), rim_temp = '';
	for(let n=0; n<cluster_locs.length; n++){
		//debug.innerHTML += "<br>current rim is "+rim;
		//debug.innerHTML += "<br>on cluster member "+cluster_locs[n];
		rim_temp = surroundings(cluster_locs[n],n_rows,n_cols);
		//debug.innerHTML += "<br>surroundings = "+rim_temp;
		for(let r=0; r<rim_temp.length; r++){
			//debug.innerHTML += "<br>for the rim candidate "+rim_temp[r]+",";
			//debug.innerHTML += "<br> is it included in rim? "+rim.includes(rim_temp[r]);
			//debug.innerHTML += "<br> is it included in cluster? "+cluster_locs.includes(rim_temp[r]);
			if(rim.includes(rim_temp[r]) || cluster_locs.includes(rim_temp[r])){continue;}
			//debug.innerHTML += "<br>adding to rim";
			rim.push(rim_temp[r]);
		}
	}
	return rim;
}
function make_cluster(seed_loc,cluster_size,n_rows,n_cols){
	//debug.innerHTML += "<br>making cluster";
	let cluster_locs = [seed_loc], rim_temp = '', i=0;
	for(let n=0; n<cluster_size-1; n++){
		//debug.innerHTML += "<br>current cluster size = "+n;
		//debug.innerHTML += "<br>current cluster locs are "+cluster_locs;
		rim_temp = define_rim(cluster_locs,n_rows,n_cols);
		//debug.innerHTML += "<br>returned rim_temp "+rim_temp;
		i = Math.floor(Math.random()*rim_temp.length);
		//debug.innerHTMML += "<br>randomly add the "+i+"-th rim to the cluster: r,c = "+rim_temp[i];
		cluster_locs.push(rim_temp[i]);
	}
	return cluster_locs;
}
function get_new_nummatr_and_clusters(){
	n_letters = Math.ceil(cvs.width / 5.4 / 2);
	n_lines = Math.ceil(cvs.height / line_ht);
	//debug.innerHTML += "<br>n_letters = "+n_letters+", n_lines = "+n_lines;
	n_tot = n_letters * n_lines;
	seed_ratio = 0.05;//proportion of shining letter seeds to total # of letters
	max_cluster_size = 7;
	nummatr = [];
	cluster_locs = [];
	if(letter_loc_keep & nummatr_old_string != ""){
		nummatr_old = JSON.parse(nummatr_old_string);
		cluster_locs_old = JSON.parse(cluster_locs_old_string); 
		if(nummatr_old.length == n_lines && nummatr_old[0].length == n_letters){
			nummatr = nummatr_old;
			cluster_locs = cluster_locs_old;
		}
	}
	else{
		for(let l=0; l<n_lines; l++){
			nummatr.push(Array(n_letters).fill().map(() => Math.floor(Math.random() * 10)));
		}
		seed_locs = Array(Math.floor(n_tot * seed_ratio)).fill().map(() => Math.floor(Math.random() * n_tot));
		cluster_sizes = Array(seed_locs.length).fill().map(() => Math.floor(Math.pow(Math.random(),3)*max_cluster_size)+1);
		//debug.innerHTML += "<br>"+cluster_sizes;
		for(let s=0; s<seed_locs.length; s++){
			row = Math.floor(seed_locs[s]/n_letters);
			col = seed_locs[s]%n_letters;
			//debug.innerHTML += "<br>row,col = "+row+","+col;
			cluster_locs.push(make_cluster([row,col],cluster_sizes[s],n_lines,n_letters));
			//debug.innerHTML += "<br>cluster locs = "+cluster_locs[s];
		}
	}
	return [nummatr,cluster_locs];
}
function update_nummatr(){
	///cycle each number by adding 1 or if 9 go back to 0
	for(let r=0; r<nummatr.length; r++){
		for(let c=0; c<nummatr[r].length; c++){
			nummatr[r][c] = (nummatr[r][c]+1)%10;
		}
	}
	///move the highlights to the right with some non-random jittering. Jittering needs to be non-random for it to loop with a finite # of frames.
	/*
	Strategy:
	- a loop is the least common multiple between 10 (for the loop of number grid from 0 to 9) and the # of columns...or to simplify, multiply the # cols by 10
	-- because the number grid must return to its original config (must be a multiple of 10)...
	-- ...and the rightward-moving shiny clusters must return to their original configs (must be a multiple of the # columns)
	- Every cluster has a life expectancy < loop length and completes at least 1 life cycle during a loop. 
	- clusters start their lives with size = 1, increases in size over time, then decreases back to 0.
	- okay not to end exactly where it started
	The average # of clusters visible at any frame is A such that
	- N = total # clusters
	- P = one loop period (= # frames)
	- L = cluster's avg life expectancy
	A = (sum of L across clusters)/P = L * N / P
	L*N = total "person-hours" = A*P, L <= P. So, N > A.
	- Let user decide A. P is calculated from width. Let L = 10 from observation. Calculate N.
	- During get_new_nummatr_and_clusters(), define N (not A) seeds at random locations.
	- These seeds will "bud" with cluster size=1 when its location has the number 0.
	- On the next frame, they wil move:
		- one column to the right
		- grow or contract by 1 such that its cluster size is 1->2->3->4->5->5->4->3->2->1
			- the relative position of its new cluster member or deleted member is decided by the #s surrounding it. Largest number takes it; if multiple equals exist, preference goes to front (right) > top > bottom > back (left)

	*/
	for(let s=0; s<cluster_locs.length; s++){
		for(let n=0; n<cluster_locs[s].length; n++){
			cluster_locs[s][n][1]= (cluster_locs[s][n][1]+1)%n_letters; 
		}
	}
	return;
}
/************************* DRAWING FUNCTIONS *************************/
function draw_bg(){
	c.save();
	c.fillStyle="#000000";
	c.fillRect(0,0,cvs.width,cvs.height);
	c.restore();
}
function draw_logo(){
	logo_orig_x = cvs.width/2;
	logo_orig_y = triangle_h+crop_h*logo_y_prop;
	logo_r = crop_w/2*logo_r_prop;
	c.save();
	c.strokeStyle = "#199cae";
	c.lineWidth = logo_r/12;
	c.globalAlpha = logo_alpha;
	c.beginPath();
	///the outer circle
	c.arc(logo_orig_x, logo_orig_y, logo_r, 0, 2*Math.PI);
	///the "trunk"
	c.moveTo(logo_orig_x, logo_orig_y - logo_r/3);
	c.lineTo(logo_orig_x, logo_orig_y + logo_r/3);
	///the "upper extremities" and "ceiling"
	ue_offset = (1+2*Math.sqrt(71/4))/12*logo_r;
	c.moveTo(logo_orig_x, logo_orig_y + logo_r/6);
	c.lineTo(logo_orig_x - ue_offset, logo_orig_y + logo_r/6 - ue_offset);
	c.closePath();
	c.moveTo(logo_orig_x, logo_orig_y + logo_r/6);
	c.lineTo(logo_orig_x + ue_offset, logo_orig_y + logo_r/6 - ue_offset);
	///the "lower extremities"
	le_offset = (-1+Math.sqrt(17))/6*logo_r;
	c.moveTo(logo_orig_x, logo_orig_y + logo_r/3);
	c.lineTo(logo_orig_x - le_offset, logo_orig_y + logo_r/3 + le_offset);
	c.moveTo(logo_orig_x, logo_orig_y + logo_r/3);
	c.lineTo(logo_orig_x + le_offset, logo_orig_y + logo_r/3 + le_offset);
	///the "ceiling" - note that trying to complete a triangle with the "upper extremities" will create and unwieldly acute angle accentuation.
	c.moveTo(logo_orig_x - ue_offset, logo_orig_y + logo_r/6 - ue_offset);
	c.lineTo(logo_orig_x + ue_offset, logo_orig_y + logo_r/6 - ue_offset);
	///the "wall"
	c.moveTo(logo_orig_x - ue_offset, logo_orig_y + logo_r/6 - ue_offset);
	c.lineTo(logo_orig_x - ue_offset, logo_orig_y - logo_r/6 + ue_offset);
	c.closePath();
	c.stroke();
	c.restore();
}
function draw_nummatr(nummatr,cluster_locs){
	n_lines = nummatr.length;
	n_letters = nummatr[0].length;
	//debug.innerHTML += "<br>n_lines, n_letters: "+n_lines+","+n_letters;
	c.save();
	c.font = (36*scale)+"px Courier New";
	c.textAlign = "left";
	c.fillStyle="#FFFFFF";
	c.globalAlpha=0.2;
	//let nums = "";
	for(let l=0; l<n_lines; l++){
		nums = nummatr[l].join(" ");
		c.fillText(nums,0,line_ht*(l+1));
	}
	///display shining number clusters
	c.strokeStyle="rgb("+color_letters+")";
	c.globalAlpha=0.5;
	c.lineWidth = 20*scale;
	c.filter = "blur("+10*scale+"px)";

	for(var s=0; s<cluster_locs.length; s++){
		for(var n=0; n<cluster_locs[s].length; n++){
			if(cluster_locs[s][n][0]<0 || cluster_locs[s][n][0]>=n_lines
				|| cluster_locs[s][n][1]<0 || cluster_locs[s][n][1]>=n_letters){continue;}
			letter = nummatr[cluster_locs[s][n][0]][cluster_locs[s][n][1]];
			///make an array filled with space character followed by the character to shine
			string = " ".repeat(cluster_locs[s][n][1]*2) + letter;
			//debug.innerHTML += "<br>"+string;
			c.strokeText(string,0,line_ht*(cluster_locs[s][n][0]+1));
		}
	}
	c.restore();
}
function draw_cropbox(){
	c.strokeStyle="#FFFFFF";
	c.strokeRect(triangle_w, triangle_h, crop_w, crop_h);
}
/************************* EXECUTE *************************/
/****** "static" elements (generated only once) ******/
function initialize(){
	//get user-set parameters
	///frame and triangle scale
	scale = parseFloat(document.getElementById("scale").value);
	crop_wu = parseInt(document.getElementById("crop_wu").value);
	crop_hu = parseInt(document.getElementById("crop_hu").value);
	triangle_wu = parseFloat(document.getElementById("triangle_wu").value);
	triangle_hu = parseFloat(document.getElementById("triangle_hu").value);
	
	///triangle color mixture parameters
	color_above = document.getElementById("color_above").value.split(",").map(Number);
	color_below = document.getElementById("color_below").value.split(",").map(Number);
	color_noise = document.getElementById("color_noise").value.split(",").map(Number);
	maxmixratio = parseFloat(document.getElementById("maxmixratio").value);

	///triangle transparency parameters
	transpcap_prop = parseFloat(document.getElementById("transpcap_prop").value);
	alpha_atan_compress = parseFloat(document.getElementById("alpha_atan_compress").value);
	alpha_rand_range = parseFloat(document.getElementById("alpha_rand_range").value);

	///logo parameters
	logo_y_prop = parseFloat(document.getElementById("logo_y_prop").value);
	logo_r_prop = parseFloat(document.getElementById("logo_r_prop").value);
	logo_alpha = parseFloat(document.getElementById("logo_alpha").value);
	
	///letter matrix parameters
	color_letters = document.getElementById("color_letters").value;
	
	///old state
	tri_colormix_keep = (document.getElementById("tri_colormix_keep_yn").checked)?true:false;
	tri_colormix_old_string = document.getElementById("tri_colormix_old").value;
	letter_loc_keep = (document.getElementById("letter_loc_keep_yn").checked)?true:false;
	nummatr_old_string = document.getElementById("nummatr_old").value;
	cluster_locs_old_string = document.getElementById("cluster_locs_old").value;
	
	setScale();
	debug.innerHTML = 'width '+cvs.width+', height '+cvs.height;

	/****** establish background color in a way that it prints as image ******/
	draw_bg();

	/****** draw the logo ******/
	draw_logo();

	/****** debug: draw a circle ******/
	/*circ = new Circle(
		100, 220,
		20, 'rgb('+color_on_grad(100,220,triangle_w, triangle_h, crop_w, crop_h, 90, [[0,0,0],[255,0,0]]).join()+')');
	debug.innerHTML += "<br>"+circ.x+", "+circ.y;
	circ.draw();
	*/
	/****** debug a triangle ******/
	/*let tri = new IsoscelesTriangle(100,200,24,34,30,[8,103,118].join());//"8,103,118"
	tri.draw();
	*/
	
	/****** draw a matrix of numbers ******/

	///prepare the number matrix and cluster locations
	debug.innerHTML += "<br>preparing nummatr and cluster_locs";
	[nummatr,cluster_locs] = get_new_nummatr_and_clusters();

	///de-stringify and pass current nummatr to cluster_locs
	document.getElementById("nummatr_old").value = JSON.stringify(nummatr);
	document.getElementById("cluster_locs_old").value = JSON.stringify(cluster_locs);
	///display the number matrix
	draw_nummatr(nummatr,cluster_locs);

	/****** draw a grid of triangles ******/
	debug.innerHTML += "<br>draw grid";
	tiles = new IsosTiles(
		11,22,
		triangle_w,triangle_h,0,
		[color_above,color_below],[color_noise], maxmixratio
	);
	//[[65,125,112,0.1],[0,80,131,0.8]], [[65,175,112]]
	//noisecolor: [65,175,112] pale green;[207,105,244],[255,0,0]; second basecolor_grad[0,80,131,0.8]
	if(tri_colormix_keep){
		//use old tiles inheriting the colors and transparencies
		tiles.copy_old_colormix(tri_colormix_old_string);
	}
	tiles.draw();

	/****** draw the bar graph ******/
	bargraph = new BarGraph(
		triangle_w, crop_h+triangle_h, 120*scale,8*scale,
		[880*scale,1024*scale,840*scale,760*scale,340*scale,160*scale,32*scale],
		[0,200,225],0.2
	);
	bargraph.draw();

	/****** draw the cropping box ******/
	draw_cropbox();

	/****** debug text output ******/
	debug.innerHTML += "<br>it ran till the end";
}

/****** dynamic elements (altered by user inputs) ******/
animeID = 0;
function animate() {

	//debug.innerHTML += "<br>start animating";

	//get user-set parameters
	modeCx = document.getElementById('mode');
	//debug.innerHTML += "<br>play-stop slider is checked? "+modeCx.checked;
	animeID = requestAnimationFrame(animate);//comment it out to prevent redrawing every split second
	//bRect = cvs.getBoundingClientRect();//apparently not needed
	
	///draw some unchanging elements
	draw_bg();
	draw_logo();
	///update the number matrix, then draw
	update_nummatr();
	draw_nummatr(nummatr,cluster_locs);
	tiles.draw();
	bargraph.draw();
	draw_cropbox();

	
	/****** debug: draw a circle ******/
	/*
	radius_jitter = Math.random()+0.5;
	//debug.innerHTML += "<br>radius jitter "+radius_jitter;
	circ = new Circle(
		100, 220,
		20*radius_jitter, 'rgb('+color_on_grad(100,220,triangle_w, triangle_h, crop_w, crop_h, 90, [[0,0,0],[255,0,0]]).join()+')');
	//debug.innerHTML += "<br>"+circ.x+", "+circ.y;
	circ.draw();
	*/
	return animeID;
}
function toggle_animation(){
	modeCx = document.getElementById('mode');
	//debug.innerHTML += "<br>play-stop slider is checked? "+modeCx.checked;
	if(modeCx.checked){
		animeID = animate(nummatr,cluster_locs);
	}
	else{
		cancelAnimationFrame(animeID);
	}
}