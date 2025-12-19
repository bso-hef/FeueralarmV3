Const AnsiPath = "Tabelle2.csv"
Const Utf8Path = "Tabelle2.csv"

Const adTypeBinary = 1
Const adTypeText = 2
Const adSaveCreateOverWrite = 2
 
Dim BinaryStream, Text
    
Set BinaryStream = CreateObject("ADODB.Stream")
        
With BinaryStream
    .Type = adTypeText
    .Charset = "x-Ansi"
    .Open
    .LoadFromFile AnsiPath
     Text = .ReadText
    .Close
End With
        
With BinaryStream
    .Type = adTypeText
    .Charset = "UTF-8"
    .Open
    .WriteText Text
    .SaveToFile Utf8Path, adSaveCreateOverWrite
    .Close
End With