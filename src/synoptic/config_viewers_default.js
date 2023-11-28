// Viewers Configuration Parameters

var PBIColorTable = ["#00B8F1", "#DE3A15", "#FF9A00", "#3ACB35", "#BBA8E8", "#DD6952", "#7FD5DB", "#60AF89", "#91A9D0", "#C7F073", "#5E69D8", "#BD8E29"];
var PBIColorBackground = "#FFFFFF";
var PBIColorForeground = "#D6862D";
var PBIColorBad = "red";
var PBIColorGood = "green";
var PBIColorMaximum = "red";
var PBIColorMinimum = "green";

// SVG Screen dimensions (must match <svg> tag dimensions on SVG screens)
// <svg width="2400" height="1500">
var ScreenViewer_SVGMaxWidth = 3840; // default SVG screen width in pixels
var ScreenViewer_SVGMaxHeight  = 2160; // default SVG screen height in pixels

var ScreenViewer_Background  = '#DDDDDD'; // background color for Inkscape SAGE SVG screens
var ScreenViewer_BackgroundSVG = 'black'; // background color for Inkscape SAGE SVG container
var ScreenViewer_ToolbarColor = 'none'; // toolbar color
var ScreenViewer_BarBreakerSwColor = "steelblue"; // color for DJ, SC and bars

// user color palette (use in Inkscape+SAGE color fields as "-cor-05" or "-cor-49")
var ScreenViewer_ColorTable = new Array();
ScreenViewer_ColorTable[0]  = 'white'; // 
ScreenViewer_ColorTable[1]  = 'white'; // sc ou dj falha
ScreenViewer_ColorTable[2]  = 'white'; // 
ScreenViewer_ColorTable[3]  = ScreenViewer_Background; // dj ab
ScreenViewer_ColorTable[4]  = ScreenViewer_BarBreakerSwColor; // sc ou dj fc
ScreenViewer_ColorTable[5]  = ScreenViewer_BarBreakerSwColor; // sc ab
ScreenViewer_ColorTable[6]  = 'cornsilk'; // sc ou dj 00 
ScreenViewer_ColorTable[7]  = 'cornsilk'; // sc ou dj 11
ScreenViewer_ColorTable[8]  = ScreenViewer_BarBreakerSwColor; // borda do dj ab
ScreenViewer_ColorTable[9]  = '#AAAAAA'; // unidades de medidas
ScreenViewer_ColorTable[10] = 'cadetblue'; // outras medida ok
ScreenViewer_ColorTable[11] = 'red'; // medida fora de faixa
ScreenViewer_ColorTable[12] = 'white'; // medida ou estado falhado
ScreenViewer_ColorTable[13] = ScreenViewer_BarBreakerSwColor; // titulo da tela (SE)
ScreenViewer_ColorTable[14] = ScreenViewer_BarBreakerSwColor; // texto de linha
ScreenViewer_ColorTable[15] = '#777777'; // n�mero de equipamento
ScreenViewer_ColorTable[16] = ScreenViewer_BarBreakerSwColor; // barra 230kV
ScreenViewer_ColorTable[17] = ScreenViewer_BarBreakerSwColor; // barra 138kV 
ScreenViewer_ColorTable[18] = ScreenViewer_BarBreakerSwColor; // barra de 69kV
ScreenViewer_ColorTable[19] = ScreenViewer_BarBreakerSwColor; // barra de alimentadores 13kV/23kV
ScreenViewer_ColorTable[20] = 'cadetblue'; // medida de MW ok
ScreenViewer_ColorTable[21] = 'cadetblue'; // medida de MVAr ok
ScreenViewer_ColorTable[22] = 'cadetblue'; // medida de kV ok
ScreenViewer_ColorTable[23] = 'cadetblue'; // medida de corrente ok
ScreenViewer_ColorTable[24] = 'cadetblue'; // medida de tap ok
ScreenViewer_ColorTable[25] = ScreenViewer_BarBreakerSwColor; // cor da barra de 500kV
ScreenViewer_ColorTable[26] = 'gray'; // texto estados
ScreenViewer_ColorTable[27] = 'gray'; // grade de estados
ScreenViewer_ColorTable[28] = 'darkgreen'; // estados off
ScreenViewer_ColorTable[29] = 'darkred'; // estado on
ScreenViewer_ColorTable[30] = 'red'; // estado de alarme
ScreenViewer_ColorTable[31] = 'lightgray'; // quadro de estados
ScreenViewer_ColorTable[32] = 'black'; // borda do quadro de estados
ScreenViewer_ColorTable[33] = '#D7D7D7'; // �rea de opera��o
ScreenViewer_ColorTable[34] = 'gray'; // s�mbolo de aterramento
ScreenViewer_ColorTable[35] = ScreenViewer_BarBreakerSwColor; // estado normal
ScreenViewer_ColorTable[36] = 'mediumvioletred'; // estado anormal
ScreenViewer_ColorTable[37] = 'red'; // estado alarmado
ScreenViewer_ColorTable[38] = '#999999'; // texto est�tico
ScreenViewer_ColorTable[39] = '#DDE8DD'; // quadro de status normal
ScreenViewer_ColorTable[40] = 'yellow'; // quadro de status alarme
ScreenViewer_ColorTable[41] = 'deepskyblue'; // medida congelada
ScreenViewer_ColorTable[42] = 'red'; // medida alarmada
ScreenViewer_ColorTable[43] = 'cadetblue'; // outras medidas ok
ScreenViewer_ColorTable[44] = 'red'; // alarm priority 0
ScreenViewer_ColorTable[45] = 'yellow'; // alarm priority 1
ScreenViewer_ColorTable[46] = 'orange'; // alarm priority 2
ScreenViewer_ColorTable[47] = 'fucsia'; // alarm priority 3 (diagn�stico)
ScreenViewer_ColorTable[48] = '#CCCCCC'; // state box fill color inactive 
ScreenViewer_ColorTable[49] = '#CCCCCC'; // state box border color inactive 
ScreenViewer_ColorTable[50] = '#505050'; // state box active text color   
ScreenViewer_ColorTable[51] = 'lightsteelblue'; // state box fill color ON 
ScreenViewer_ColorTable[52] = 'tan'; // state box fill color OFF
ScreenViewer_ColorTable[53] = '#888888'; // state box inactive text color  
ScreenViewer_ColorTable[54] = 'red'; // state box operated text color  
ScreenViewer_ColorTable[55] = 'lightsteelblue'; // analog range ok
ScreenViewer_ColorTable[56] = '#777777'; // analog range out of limits
ScreenViewer_ColorTable[57] = ScreenViewer_BarBreakerSwColor; // analog indicator ok
ScreenViewer_ColorTable[58] = 'crimson'; // analog indicator out of limits
ScreenViewer_ColorTable[59] = '#CCCCCC'; // load rectangle MW or MVA or A
