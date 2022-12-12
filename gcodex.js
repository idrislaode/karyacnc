function mround(x) {
	return parseFloat(x).toFixed(3);
}

function mround4(x) {
	return parseFloat(x).toFixed(4);
}

var packages = [];
var compress = [];

function write(w, s) {
	if (s > 0) compress.push(w & 255);
	if (s > 1) compress.push((w >> 8) & 255);
	if (s > 2) compress.push((w >> 16) & 255);
	if (s > 3) compress.push((w >> 24) & 255);
}
var cpos = 0;

function read(n) {
	var ac = 0;
	if (cpos+n>=compress.length) return null;
	for (var i = 0; i < n; i++) {
		ac += (compress[cpos + i]) << (i * 8);
	}
	cpos += n;
	return ac;
}

var holdpos = 0;

function hold() {
	holdpos = compress.length - 1;
}

var sendg1 = "";



var cntg28 = 0;
var totalgcode = 0;

function endcompress() {}
var lx = -10.0;
var ly = -10.0;
var lz = -10.0;
var le = -10.0;
var lf = 10.0;
var lF1 = 10.0;
var lF0 = 10.0;

var lS = 0;
var lh = 0;
var ole = 0;
var oxmin = 0;
var oxmax = 0;
var oymin = 0;
var oymax = 0;
var ozmin = 0;
var ozmax = 0;
var eE = 0;
var E = 0;
var F0 = 0;
var F1 = 0;
var isRel = 0;
var overtex = []; // will hold x,y,z
var lines = []; // will hold n1,n2 that index point to vertex

var zdeg = 45;
var xdeg = 35;
var sinz = 0.707;
var cosz = 0.707;
var sinx = 0.707;
var cosx = 0.707;
var filament = 0;
var printtime = 0;

var eScale = 50;
var xyScale = 500;
var zScale = 10;
var xySize = 2;
var zSize = 1;
var eSize = 1;
var fScale = 2; // to get range 0-511 from 0-255

// using version we hope can decode many form of GCODE COMPRESSED form
// at first maybe they are different in compresiion ratio of each axis
var GXVER = 1;
if (GXVER == 1) {
	eScale = 1 / 0.02;
	xyScale = 2 / 0.01; // to get resolution 0.002mm and max step is 64mm before split into many step
	zScale = 1 / 0.1;
	xySize = 2; // 2 bytes
	zSize = 1; // 1 bytes
	eSize = 1; // 1 bytes
	fScale = 2; // to get range 0-500 from 0-255
}
var yflip=1;
function datasize(n) {
	return (1 << (n * 8 - 1)) - 2;
}
var xyLimit = datasize(xySize);
var zLimit = datasize(zSize);
var eLimit = datasize(eSize);


var ln = 0;
var warnoverflow = 0;
var isF = 0;
var repeatsame = 0;
var xsub = 0;
var ysub = 0;
var zsub = 0;

function approx_distance( dx,  dy)
{
  return Math.sqrt(dx*dx+dy*dy);	
}

function writeline(h,dx,dy,dz,F){
var isX,isY,isZ; 
	if (F>0) h |= 1 << 3;
	if (isX=dx!=0) h |= 1 << 4;
	if (isY=dy!=0) h |= 1 << 5;
	if (isZ=dz!=0) h |= 1 << 6;

	write(h, 1);

	if (F>0) {
		write(F, 1);
	}
	if (isX) {
		write(dx + xyLimit, xySize);
		//log(x);
	}
	if (isY) {
		write(dy + xyLimit, xySize);
	}
	if (isZ) {
		write(dz + zLimit, zSize);
	}

		
}
/*

G1 X0 Y0  F2000
G1 X0 Y-14.93 
G1 X19.39                        
G2 X15 Y-25 I10.61 J-10.61  
G1 X0 

*/

function gcode_arc(h,lf,cx1,cy1,cx2,cy2,lz, fI, fJ, ccw)
{
  var radius = Math.sqrt(fI*fI+fJ*fJ);

  var cx = cx1 + fI ;
  var cy = cy1 + fJ ;


  var r_axis0 = -fI;  // Radius vector from center to current location
  var r_axis1 = -fJ;
  var rt_axis0 = cx2 - cx;
  var rt_axis1 = cy2 - cy;


  // CCW angle between position and target from circle center. Only one atan2() trig computation required.
  var angular_travel = Math.atan2(r_axis0 * rt_axis1 - r_axis1 * rt_axis0, r_axis0 * rt_axis0 + r_axis1 * rt_axis1);
  if ((!ccw && angular_travel <= 0.00001) || (ccw && angular_travel < -0.000001)) {
    angular_travel += 2.0 * Math.PI;
  }
  if (ccw) {
    angular_travel -= 2.0 * Math.PI;
  }

  var millimeters_of_travel = Math.abs(angular_travel * radius); //hypot(angular_travel*radius, fabs(linear_travel));
  if (millimeters_of_travel < 1) {
    return;// treat as succes because there is nothing to do;
  }
  var segments = Math.max(1, Math.floor(millimeters_of_travel*2/xyScale));

  var theta_per_segment = angular_travel / segments;



  lx=cx1;
  ly=cy1;
		// add printtime
  printtime += Math.sqrt(millimeters_of_travel / (xyScale * xyScale)) / (lf*fScale);
  for (var i = 1; i < segments; i++) {
    // Increment (segments-1)
	var cos_Ti  = Math.cos(i * theta_per_segment);
	var sin_Ti  = Math.sin(i * theta_per_segment);
	r_axis0 = -fI * cos_Ti + fJ * sin_Ti;
	r_axis1 = -fI * sin_Ti - fJ * cos_Ti;
    var nx = Math.floor(cx + r_axis0);
    var ny = Math.floor(cy + r_axis1);
    //move.axis[nE] = extscaled>>4;
    writeline(h,nx-lx, ny-ly,0,0);
    lx=nx;
    ly=ny;
	overtex.push([lx / xyScale, ly / xyScale, lz / zScale, 0, 1,lf*fScale]);
	oxmax = Math.max(oxmax, lx / xyScale);
	oxmin = Math.min(oxmin, lx / xyScale);
	oymax = Math.max(oymax, ly / xyScale);
	oymin = Math.min(oymin, ly / xyScale);
  }
  writeline(h,cx2-lx, cy2-ly,0,0);
  lx=cx2;
  ly=cy2;
  overtex.push([lx / xyScale, ly / xyScale, lz / zScale, 0, 1,lf*fScale]);
}

var rlx,rly;
function gcodeline(bh,G,num,x,y,z,dx,dy,dz,I,J,R){
	stepx = Math.floor(dx / num);
	stepy = Math.floor(dy / num);
	stepz = Math.floor(dz / num);
	steplx = dx - (stepx * (num - 1)); // to make sure total move is same
	steply = dy - (stepy * (num - 1));
	steplz = dz - (stepz * (num - 1));
	
	if (G == 0) {
		F = F0;
		lf = lF0;
	} else {
		F = F1;
		lf = lF1;
	}
	
	var isF = F != lf;
	//lf=F;
	if (G == 0) lF0 = F0; else lF1 = F1;
	var isX = Math.abs(dx)>0;
	var isY = Math.abs(dy)>0;
	var isZ = Math.abs(dz)>0;
	if (G<2){
		for (var i = 1; i <= num; i++) {
			if (i == num) {
				wx = steplx;
				wy = steply;
				wz = steplz;

			} else {
				wx = stepx;
				wy = stepy;
				wz = stepz;

			}
			writeline(bh,wx,wy,wz,i==1 && isF?F:0);
			isF=0;

		}
		overtex.push([lx / xyScale, ly / xyScale, lz / zScale, 0, G,lf*fScale]);
		// add printtime
		printtime += Math.sqrt((dx * dx + dy * dy) / (xyScale * xyScale)) / (F*fScale);
	} else {
		// arc
		gcode_arc(bh,lf,rlx,rly,x,y,z,I,J,G==2);

	}
	rlx=lx;
	rly=ly;	
}

var lastG=0;
function addgcode(g) {
	// read gcode
	ln++;
	totalgcode += g.length;
	gd = {};
	lv = "";
	lk = "";
	gk = "";
	g = g.toUpperCase();
	if (g.indexOf(";REP:") == 0) {
		repeatsame = parseInt(g.split(":")[1]);
		//write(1 | (2<<1) | (repeatsame & 63), 1);
		//write(repeatsame >> 5,1);
		return;
	}
	for (var i = 0; i < g.length; i++) {
		c = g[i];

		if (".0123456789-".indexOf(c) >= 0) {
			lv += c;
		}
		if ((" ;MGXYZEFSTRIJKP".indexOf(c) >= 0) || (i == g.length - 1)) {
			if (lv) {
				gk += lk;
				gd[lk] = lv * 1;
				lv = "";
			}
			if ("MGXYZEFSTRIJKP".indexOf(c) >= 0) lk = c;
		}
		if (c == ';') break;
	}

	var h = 0;
	var f = 0;
	var s = 0;
	var x = 0;
	// generic Gcode motion process before compress
	arccw = 0;
	var is92 = 0;
	if (gk.indexOf('G') + 1) {
		switch (gd['G']) {
			case 90: // absolute
				isRel = 0;
				break;
			case 91:
				isRel = 1;
				break;
			case 92: // absolute
				is92 = 1;
				break;
			case 2:
				arccw = 1;
			case 3:
				break;
		}
	}

	//


	if (gk.indexOf('M') + 1) {
		h = 1;
		switch (gd['M']) {
			case 3: // spindle on
				h |= 0;
				break;
			case 5: // spindle off as M3 S0
				h |= 0;
				gd['S'] = 0;
				break;
			case 109:
				h |= 1 << 1;
				break;
			case 2: // i think we dont need M2
				h |= 2 << 1;
				break; // final
			default:
				return; // not implemented
		}
		s = parseInt(gd['S']);
		if (s == undefined) s = 255;
		h |= 1 << 3; // S is in F

		// special M3 with X and Y is to inform the size of the material needed, its 100x the resolution

		var isX = gk.indexOf('X') + 1;
		var isY = gk.indexOf('Y') + 1;
		var isP = gk.indexOf('P') + 1;
		if (isX) h |= 1 << 4;
		if (isY) h |= 1 << 5;
		if (isP) h |= 1 << 7; // use E as P

		write(h, 1);
		write(s, 1);

		if (isX) {
			var wx = Math.round(gd['X'] * 0.01 * xyScale);
			write(wx + xyLimit, xySize);
		}
		if (isY) {
			var wx = Math.round(gd['Y'] * 0.01 * xyScale);
			write(wx + xyLimit, xySize);
		}
		if (isP) {
			var wx = Math.round(gd['P'] * 0.01);
			write(wx, eSize);
		}

		console.log(ln + " M" + gd['M'] + " S" + s);
	} else {
		if (!(gk.indexOf('G') + 1)) {
			gk+="G";
			gd["G"]=lastG;
		}
	}
	var rmul = -1;
	var isS = 0;
	if (gk.indexOf('G') + 1) {
		h = 0;
		var G = gd['G'];
		lastG=G;
		switch (G) {
			case 2:
				h |= 1 << 1; // G2, R is +
				rmul = 1; // we will save R in S
				isS = 1;
				break; // 
			case 3:
				h |= 1 << 1; // G2 with R is -

				break; // 
			case 0:
				h |= 0 << 1; // treat all movement as G1, this will save 1 state
				break; // we need bit 1 as identify a repeat header
			case 1:
				h |= 1 << 1;
				break;
			case 28:
				h |= 2 << 1;
				//cntg28--;
				break;
			case 92:
				break;
			case 192:
				h |= 3 << 1;
				ole = 0;
				E = 0;
				eE = 0;
				console.log("W" + E);
				break;
			default:
				return; // not implemented
		}
		var isF = isF || (gk.indexOf('F') + 1);
		var isX = gk.indexOf('X') + 1;
		var isY = gk.indexOf('Y') + 1;
		var isZ = gk.indexOf('Z') + 1;
		var isI = gk.indexOf('I') + 1;
		var isJ = gk.indexOf('J') + 1;
		var isR = gk.indexOf('R') + 1;
		var isE = gk.indexOf('E') + 1;
		X = Y = Z = F = S = 0;
		dx = dy = dz = de = 0;
		if (isF && !is92) { // we use F bit in G92 as P probe Z

			if (G == 1) lf = F1;
			else lf = F0;
			
			F = Math.min(Math.round(gd['F'] / (fScale * 60)), 255); // 
			if (G == 1) F1 = F;
			else F0 = F;
			isF = lf!=F; // we dont care about the precission here :D  
		}
		I=J=R=0;
		if (isI) {
			I = gd['I'] * xyScale; 
		}
		if (isJ) {
			J = gd['J'] * xyScale; 
		}
		if (isR) {
			R = gd['R'] * xyScale; 
		}


		if (isX) {
			if (is92) {
				xsub = -lx + gd['X'] * xyScale;
			} else {
				X = Math.round(gd['X'] * xyScale - xsub); // up to resolution 0.005mm max move is 64mm
				if (isRel) X += lx;
				dx = X - lx; // X - dx = X - X + lx=lx 
				if (X != lx) lx = X;
				else isX = 0;
			}
			//if (Math.abs(X)>31000)warnoverflow=1;
		}
		if (isY) {
			if (is92) {
				ysub = -ly + gd['Y'] * xyScale;
			} else {
				Y = Math.round(gd['Y'] * yflip * xyScale - ysub);
				if (isRel) Y += ly;
				dy = Y - ly;
				if (Y != ly) ly = Y;
				else isY = 0;
			}
			//if (Math.abs(Y)>31000)warnoverflow=1;
		}
		if (isZ) { // i think z is not to precise is ok, DZ is max 0.1 on 3d printer anyway
			if (is92) {
				zsub = -lz + gd['Z'] * zScale;
			} else {
				Z = Math.round(gd['Z'] * zScale - zsub); // so i am thinking use 1 byte for dz
				if (isRel) Z += lz; // max move is 12mm, minimum 0.1
				dz = Z - lz;
				if (Z != lz) lz = Z; // else isZ=0;
			}
		}
		if (is92) {
			if (!(isX || isY || isZ || isF)) {
				xsub = 0;
				ysub = 0;
				zsub = 0;
			}
		}
		if (isE) {
			E = Math.round(gd['E'] * eScale); // E need to be precise on 3d printer
			if (isRel) E += le; // max move 2.4mm, minimum 0.02
			de = E - le;
			le = E;
			//if (E!=le)le=E; else isE=0;
			filament = Math.max(le, filament);
		}

		var bh = h;

		// loop to break long path into small incremental path
		var num = Math.ceil(Math.abs(dx) / xyLimit);
		num = Math.max(Math.ceil(Math.abs(dy) / xyLimit), num);
		num = Math.max(Math.ceil(Math.abs(dz) / zLimit), num); // z is 1 byte
		num = Math.max(Math.ceil(Math.abs(de) / eLimit), num);
		
		// we write the relative position not the absolute
		if (!(isJ || isI || isR) && (num == 0 || G == 28)) {
			if (G == 28) {
				if (isX) h |= 1 << 4;
				if (isY) h |= 1 << 5;
				if (isZ) h |= 1 << 6;
				write(h, 1);
				if (isX) write(Math.round(gd['X'] * xyScale) + xyLimit, xySize);
				if (isY) write(Math.round(gd['Y'] * xyScale) + xyLimit, xySize);
				if (isZ) write(Math.round(gd['Z'] * xyScale) + xyLimit, xySize); // special case, Z size is same as other
			} else 
			if (isF){
				h = bh;
				h |= 1 << 3;
				write(h, 1);
				write(F, 1);
			}
			lh = h;
		} else {
			gcodeline(bh,G,num,X,Y,Z,dx,dy,dz,I,J,R);
		}
		oxmax = Math.max(oxmax, lx / xyScale);
		oxmin = Math.min(oxmin, lx / xyScale);
		oymax = Math.max(oymax, ly / xyScale);
		oymin = Math.min(oymin, ly / xyScale);
		ozmax = Math.max(ozmax, lz / zScale);
		ozmin = Math.min(ozmin, lz / zScale);	

		//console.log("G"+gd['G']+" X"+X);
	}
	
	if (!cntg28) {
		endcompress();
		cntg28 = 2;
	}
}

var decoding = 0;
var cntg28 = 0;
var rE = 0;



var main_r = 0.5;
var main_g = 1;
var main_b = 0.2;

function randomcolor() {
	main_r = mround(Math.random());
	main_g = mround(Math.random());
	main_b = mround(Math.random());
	var m = Math.max(main_b, Math.max(main_r, main_g));
	main_r /= m;
	main_g /= m;
	main_b /= m;
}
randomcolor();
var letters = '0123456789ABCDEF';

function tohex(v) {
	if (v > 255) v = 255;
	v = Math.floor(v);
	return letters[(v >> 4) & 15] + letters[v & 15];
}

function getColor(v) {
	if (v < 0) v = 0;
	return "#" + tohex(main_r * v) + tohex(main_g * v) + tohex(main_b * v);
}

var sp = 0;
var pv = 0;

function showProgress() {}

function begincompress(paste, callback1, callback2) {
	oxmax = -100000;
	oxmin = 100000;
	oymax = -100000;
	oymin = 100000;
	ozmax = -100000;
	ozmin = 100000;
	xsub = 0;
	ysub = 0;
	zsub = 0;
	filament = 0;
	eE = ole = lx = ly = lz = le =0;
	lf = 0;
	F1 = 50;
	F0 = 50;
	lF1 = 0.0;
	lF0 = 0.0;


	printtime = 0;
	//init2d(0);

	overtex = []; // will hold x,y,z
	lines = []; // will hold n1,n2 that index point to vertex
	compress = [];
	packages = [];
	isRel = 0;
	totalgcode = 0;
	// new GCX will have marking on file GX followed by 1 byte of the version
	// 
	write(71, 1);
	write(88, 1);
	write(GXVER, 1);

	if (paste) texts = paste.split("\n");
	else texts = getvalue("gcode").split("\n");
	cntg28 = 2;
	ln = 0;
	if (callback1) setTimeout(callback1, 200);
	for (var i = 0; i < texts.length; i++) {
		addgcode(texts[i]);
		if (i & 31 == 0) pv = i * 100.0 / texts.length;
	}
	h = 1;
	h |= 2 << 1;
	write(h, 1);

	console.log("From " + totalgcode + " to " + compress.length);
	console.log("Ratio " + mround(compress.length / totalgcode));


	if (callback2) callback2();
}

var decodes = "";
var decoding = 0;
var AX, AY, AZ, AE;
var shapes=[];
var shapes_ctr=0;
var PZ=0;
function decodealine() {
	var isM = 0;
	var isG = 0;
	var isX = 0;
	var isY = 0;
	var isZ = 0;
	var isE = 0;
	var isF = 0;
	var isS = 0;
	var isP = 0;
	var M = 0;
	var G = 0;
	var X = 0;
	var Y = 0;
	var Z = 0;
	var S = 0;
	var F = 0;
	var P = 0;
	var h = read(1);
	if (h==null){
		decoding=0;
		return;
	}
	var s = 0;
	if (h & 1) {
		isM = 1;
		switch ((h >> 1) & 3) {
			case 0:
				M = 3;
				break;
			case 1:
				M = 109;
				break;
			case 2:
				decoding = 0;
				return;
				break;
		}
		if (h & (1 << 3)) {
			s = read(1);
			isS = 1;
			S = s;
		}
		if (h & (1 << 4)) {
			s = read(xySize);
			isX = 1;
			X = s;
		}
		if (h & (1 << 5)) {
			s = read(xySize);
			isY = 1;
			Y = s;
		}
		if (h & (1 << 7)) {
			s = read(eSize);
			isP = 1;
			P = s * 100;
		}
		decodes += "M" + M;
		if (isS) decodes += " S" + S;
		if (isP) decodes += " P" + P;
		decodes += "\n";
	} else {
		isG = 1;
		switch ((h >> 1) & 3) {
			case 0:
				G = 0;
				break;
			case 1:
				G = 1;
				break;
			case 2:
				G = 28;
				//cntg28--;
				break;
			case 3:
				G = 92;
				rE = 0;

				break;
		}
		var x = 0;
		decodes += "G" + G;
		var shape=[];
		if (G<=1 && AZ>0){
			shape=[AX,AY,AZ];
			PZ=AZ;
		}
		if (h & (1 << 3)) {
			s = read(1);
			isF = 1;
			F = s * fScale;
			decodes += " F" + 60 * F;
		}
		if (h & (1 << 4)) {
			x = read(xySize);
			isX = 1;
			AX += (x - xyLimit) / xyScale;
			decodes += " X" + mround(AX);
		}
		if (h & (1 << 5)) {
			x = read(xySize);
			isY = 1;
			AY += (x - xyLimit) / xyScale;
			decodes += " Y" + mround(AY);
		}
		if (h & (1 << 6)) {
			if (G==28){
				x = read(xySize);
				isZ = 1;
				aZ = (x - xyLimit) / xyScale;
				decodes += " Z" + mround(aZ);
				AZ=0;
			} else {
				x = read(zSize);
				isZ = 1;
				AZ += (x - zLimit) / zScale;
				decodes += " Z" + mround(AZ);
				if (AZ<=0 && PZ>0){
					PZ=AZ;
					shapes.push(shape);
					shapes_ctr++;
				}
			}	
		}
		if (h & (1 << 7)) {
			x = read(eSize);
			isE = 1;
			AE += (x - eLimit) / eScale;
			decodes += " E" + mround(AE);
			//decodes+=" E"+mround4(rE);
		}
		decodes += "\n";


	}
	if (cntg28 == 0) {
		decoding = 0;
	}


}

function decode() {
	cpos = 3;
	cntg28 = 2;
	decoding = 1;
	decodes = "";
	rE = 0;
	AX = 0;
	AY = 0;
	AZ = 0;
	AE = 0;
	shapes=[];
	shapes_ctr=0;
	PZ=0;

	while (decoding) {
		decodealine();
	}
	return decodes;
}
