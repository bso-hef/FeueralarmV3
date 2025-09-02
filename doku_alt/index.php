<!DOCTYPE html>

<html>

    <head>

        <meta charset="UTF-8">

        <!-- Dies refreshed die Seite alle 30 Sekunden. Eventuell zu verwenden für ein reines Anzeigegerät.
             <meta http-equiv="refresh" content="30">  
        -->

            <!-- CSS Styles zur gestaltung der HTML Elemente -->
        <style>
            /* div Elemente aus der Spalte Status die farbin in grün und rot wechseln */
            #square1 {
                width: 2vw;
                height: 2vw;
                background: #090;
            }

            #square0 {
                width: 2vw;
                height: 2vw;
                background: #ff0000;
            }

            #square {
                width: 2vw;
                height: 2vw;
                background: #ababab;
            }
            /* Schriftart, Abstände und Farben des Bodies und Tabellen */
            body {
                font-family: Arial;
                width: 80vw; 
            }

            .outer-scontainer {
                background: #F0F0F0;
                border: #e0dfdf 1px solid;
                padding: 20px;
                border-radius: 2px;
            }

            .outer-scontainer table {
                border-collapse: collapse;
                width: 100%;
            }

            .outer-scontainer th {
                border: 1px solid #dddddd;
                padding: 8px;
                text-align: left;
            }

            .outer-scontainer td {
                border: 1px solid #dddddd;
                padding: 8px;
                text-align: left;
            }

        </style>

    </head>
            <!-- Funktion zum Verbinden der Datenbank und Melden des Status -->
    <?php

        function Connect() {
            $con = mysqli_connect("db5000215941.hosting-data.io", "dbu432313", "12Info-alarm", "dbs210845");

            if (mysqli_connect_errno()) {
                echo "Failed to connect to MySQL: " . mysqli_connect_error();
            }
            
            return $con;
        }

        $con = Connect();

        if(isset($_POST["anwesend"])){
            $anwesend = $_POST["anwesend"];
            $sql_befehl = "UPDATE notfall SET meldung = '1' WHERE klasse = '$anwesend'";
            $result = mysqli_query($con, $sql_befehl);
        }


        if(isset($_POST["vermisst"])){
            $vermisst = $_POST["vermisst"];
            $sql_befehl = "UPDATE notfall SET meldung = '0' WHERE klasse = '$vermisst'";
            $result = mysqli_query($con, $sql_befehl);
        }
    ?>

    <body>
        <!-- Überschrift und Button zum einlesen der CSV Datei -->
        <h2>Notfall - Evakuierungsstand der BSO Bad Hersfeld</h2>
        <p>
        <!--
            <form action="" method="post">
                <button type="submit" id="" name="einlesen" class="">Daten Einlesen</button>
                <lable>Darf nur einmalig zu Beginn des Alarms gedrückt werden!</lable>
            </form>
        -->
            <!-- Erstellen der Datenbanktabelle und einlesen der CSV Datei -->
            <?php
                if(isset($_POST["einlesen"])){
                
                    $sql1 = "DROP TABLE notfall;";

                    $sql2 = "CREATE TABLE IF NOT EXISTS `notfall` (
                        `klasse` varchar(55) NOT NULL,
                        `lehrer` varchar(55) NOT NULL,
                        `raum` varchar(55) NOT NULL,
                        `meldung` BOOLEAN DEFAULT 0 NOT NULL,
                        `kommentar` varchar(200) DEFAULT '' NOT NULL
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";

                    $result1 = mysqli_query($con, $sql1);
                    $result2 = mysqli_query($con, $sql2);

                    $file = fopen("Tabelle2.csv","r");

                    while(!feof($file)) {
                        $data = fgetcsv($file, 0, ";");
                        
                        if (!empty($data)) {
                            $klasse = $data[0];
                            $lehrer = $data[1];
                            $raum   = $data[2];

                            $sql3 = "INSERT INTO notfall (klasse, lehrer, raum) VALUES ('$klasse', '$lehrer', '$raum');";

                            mysqli_query($con, $sql3);
                        }
                        
                    }

                    fclose($file);
                }
            ?>
        </p>
        <!-- Kommentarfunktionen zu Feld und den Buttons Speichern/Loeschen -->
        <?php
        if(isset($_POST["kommentarSenden"])){
            $kommentarFeld = $_POST["kommentarFeld"];
            $kommentarSenden = $_POST["kommentarSenden"];
            $sql1 = "UPDATE notfall SET kommentar = CONCAT(kommentar, '$kommentarFeld') WHERE klasse = '$kommentarSenden'";
            $result = $result = mysqli_query($con, $sql1);
        }

        if(isset($_POST["kommentarLoeschen"])){
            $kommentarLoeschen = $_POST["kommentarLoeschen"];
            $sql1 = "UPDATE notfall SET kommentar = '' WHERE klasse = '$kommentarLoeschen'";
            $result = $result = mysqli_query($con, $sql1);
        }
        /* Button am Schluss zum löschen der Tabelle. */
        if(isset($_POST["loeschen"])){
            $sql1 = "DROP TABLE notfall";
            $result1 = mysqli_query($con, $sql1);
        }
        ?>    
        <!-- Tabelle, die aus der CSV Datei generiert wird -->
        <div class="outer-scontainer">

                <?php
                $sqlSelect = "SELECT * FROM notfall";
                $result = mysqli_query($con, $sqlSelect);

                if (!empty($result)) {
                    if (mysqli_num_rows($result) > 0) {
                ?>

                    <table id='userTable'>
                        <thead>
                            <tr>
                                <th>Lehrer</th>
                                <th>Klasse</th>
                                <th>Raum</th>
                                <th>Status</th>
                                <th>Meldung</th>
                                <th>Kommentar</th>
                                <th>Eingabe</th>
                            </tr>
                        </thead>

                        <tbody>

                        <?php
                        
                            while ($row = mysqli_fetch_array($result)) {
                            ?>
                                
                            
                            <tr>
                                <td><?php  echo $row['klasse']; ?></td>
                                <td><?php  echo $row['lehrer']; ?></td>
                                <td><?php  echo $row['raum']; ?></td>
                                <td><div id="square<?php echo $row['meldung']; ?>"></div></td>
                                <td> 
                                    <form action="" method="post">
                                        <button type="submit" id="" name="anwesend" class="" value="<?php echo $row['klasse']; ?>">Anwesend</button>
                                    </form>

                                    <form action="" method="post">
                                        <button type="submit" id="" name="vermisst" class="" value="<?php echo $row['klasse']; ?>">Vermisst</button>
                                    </form>
                                </td>
                                <td><?php echo $row['kommentar']; ?></td>
                                <td>
                                    <form action="" method="post">
                                        <input type="text" id="kommentar" name="kommentarFeld" class="kommentar" value=""></input>	
                                        <button type="submit" id="kommentar" name="kommentarSenden" class="kommentar" value="<?php echo $row['klasse']; ?>">Speichern</button>
                                        <button type="submit" id="kommentar" name="kommentarLoeschen" class="kommentar" value="<?php echo $row['klasse']; ?>">Löschen</button>
                                    </form>
                                </td>	
                            </tr>

                            <?php
                            }
                            ?>

                        </tbody>
                    </table>

            <?php }
            } ?>

        </div>
        <p> <!-- Buttons zum einlesen und löschen der Tabelle. -->
            <form action="" method="post">
                <button type="submit" id="" name="einlesen" class="">Daten Einlesen</button>
                <lable>Darf nur einmalig zu Beginn des Alarms gedrückt werden!</lable>
                <button type="submit" id="" name="loeschen" class="">Daten löschen</button>
                <lable>Löschen der Datenbank.</lable>
            </form>
        </p>
    </body>

</html>