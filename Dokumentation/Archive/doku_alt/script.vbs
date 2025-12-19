Set fso = CreateObject("Scripting.FileSystemObject")
Set Datei = fso.OpenTextFile("Tabelle1.csv")
i=0
k=0
z=0
while not Datei.AtEndOfStream
  i=i+1
  Datei.ReadLine
Wend
Datei.Close

REDIM Zeile(i)
Set Datei = fso.OpenTextFile("Tabelle1.csv")
i=0
Dim Anfang()
Dim Ende()
while not Datei.AtEndOfStream
  i=i+1
  Zeile(i) = Datei.ReadLine
  if left(Zeile(i),8) = "Lehrer;;" then
	ReDim Preserve Anfang(k+1)
    Anfang(k) = i
    k=k+1
  end if
  if left(Zeile(i),7) = "Klassen" then
	ReDim Preserve Ende(z+1)
	Ende(z) = i
	z=z+1
  end if
Wend
Datei.Close


for l=0 to UBound(Anfang)-1
  if NOT (l+1=UBound(Anfang)) then
    for j=Anfang(l)+3 to Anfang(l+1)-2
      if left(Zeile(j),1)=";" then
        temp = split(Zeile(j-1),";")(0)
        Zeile(j) = temp & Zeile(j)
      end if
    next
  else
    for j=Anfang(l)+3 to i
      if left(Zeile(j),1)=";" then
        temp = split(Zeile(j-1),";")(0)
        Zeile(j) = temp & Zeile(j)
      end if
    next
  end if
next

for l=0 to UBound(Anfang)-1
  if l+1 <> UBound(Anfang) then
    for j=Anfang(l)+3 to Anfang(l+1)-2
      temp = split(Zeile(j),";")
      Zeile(j) = temp(0) & ";" & temp(1) & ";" & temp(2)
    next
  else
    for j=Anfang(l)+3 to i
      temp = split(Zeile(j),";")
      Zeile(j) = temp(0) & ";" & temp(1) & ";" & temp(2)
    next
  end if
next


for j=Anfang(0)+3 to i
  Zeile(j) = Replace(Zeile(j),",;",";")
next


for l=0 to UBound(Anfang)-1
  if l+1 <> UBound(Anfang) then
    for j=Anfang(l)+3 to Anfang(l+1)-2
      x=Len(Zeile(j))
      if right(Zeile(j),1)="," then
	    Zeile(j) = left(Zeile(j),x-1)
      end if
	next
  else
    for j=Anfang(UBound(Anfang)-1)+3 to i
      x=Len(Zeile(j))
      if right(Zeile(j),1)="," then
	    Zeile(j) = left(Zeile(j),x-1)
      end if
	next
  end if
next

Set Datei = fso.CreateTextFile("Tabelle2.csv")
writeBool = true
for l=0 to UBound(Anfang)-1
  if l+1 <> UBound(Anfang) then
    for j=Anfang(l)+3 to Anfang(l+1)-2
	  for e=0 to Len(Zeile(j))
		if Mid(Zeile(j), e+1, 1) = ";" then
		  if Mid(Zeile(j), e+2, 1) = "L" then
			writeBool = false
		  elseif Mid(Zeile(j), e+2, 1) = "R" then
			writeBool = false
		  end if
		end if
	  next
	  if Mid(Zeile(j), Len(Zeile(j)), 1) = ";" then
	    writeBool = false
	  end if
	  if writeBool then
		    Datei.WriteLine(Zeile(j))
	  end if
	  writeBool = true
	next
  else
    for j=Anfang(l)+3 to Ende(0)-2
	  for e=0 to Len(Zeile(j))
		if Mid(Zeile(j), e+1, 1) = ";" then
		  if Mid(Zeile(j), e+2, 1) = "L" then
			writeBool = false
		  elseif Mid(Zeile(j), e+2, 1) = "R" then
			writeBool = false
		  end if
		end if
	  next
	  if Mid(Zeile(j), Len(Zeile(j)), 1) = ";" then
	    writeBool = false
	  end if
	  if writeBool then
		    Datei.WriteLine(Zeile(j))
	  end if
	  writeBool = true
    next
  end if
next
Datei.Close

Dim objShell
Set objShell = Wscript.CreateObject("WScript.Shell")

objShell.Run "convert.vbs" 


