<?php
// EN TÊTE DE FICHIER : GESTION DU CACHE CÔTÉ SERVEUR (Cache Buster)
// AUTORISATIONS CORS COMPLÈTES
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
// ICI : On ajoute Cache-Control et Pragma à la liste des headers autorisés
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");

// GESTION DU CACHE (Cache Buster côté serveur)
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Réponse rapide pour les requêtes de vérification (OPTIONS) du navigateur
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}
/*
==================================================================================================
DOCUMENTATION API - JSA STUDIO (api_volley_seance.php)
==================================================================================================

1. AUTHENTIFICATION (Login) - [POST]
   -> Testable via un outil comme Postman ou le formulaire de l'App.
   URL: https://seme-et-tisse.fr/API/api_volley_seance.php?action=login

2. LISTE DES SECTEURS (Menus déroulants Studio) - [GET]
   URL de test : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_secteurs&t=123

3. CATALOGUE DES MODÈLES MASTER (Bibliothèque) - [GET]
   URL de test : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_modeles_liste&t=123

4. DÉTAILS COMPLETS D'UN MODÈLE MASTER (Visualiseur/Edition Master) - [GET]
   URL de test : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_full_modele&id=1&t=123

5. ÉQUIPES AUTORISÉES POUR UN COACH (Sélecteur de duplication) - [GET]
   URL de test (Coach test ID 2) : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_coach_teams&coach_id=2&t=123

6. PLANIFICATIONS COPIÉES D'UNE ÉQUIPE (Mon Équipe) - [GET]
   URL de test (Coach test ID 2) : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_equipe_planifs&coach_id=2&t=123

7. CHARGEMENT D'UNE PLANIF ÉQUIPE SPÉCIFIQUE (Studio Équipe) - [GET]
   -> Charge les données depuis jsa_planif_equipe, cycles_equipe, etc.
   URL de test : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_full_planif_equipe&id=6&t=123

8. THÈMES ET SOUS-THÈMES PAR SECTEUR (Studio) - [GET]
   URL de test (Secteur 1) : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_themes_complet&secteur_id=1&t=123

9. OBJECTIFS PÉDAGOGIQUES PAR SECTEUR (Studio) - [GET]
   URL de test (Secteur 1) : https://seme-et-tisse.fr/API/api_volley_seance.php?action=get_objectifs_pedago&secteur_id=1&t=123

10. DUPLICATION MASTER VERS ÉQUIPE (Action "Utiliser") - [POST]
    -> Crée les entrées dans jsa_planif_equipe et tables rattachées.
    URL: https://seme-et-tisse.fr/API/api_volley_seance.php?action=duplicate_to_team

11. SAUVEGARDE DE MODÈLE (Création/Edition Master) - [POST]
    URL: https://seme-et-tisse.fr/API/api_volley_seance.php?action=save_modele

12. SUPPRESSION D'UN MODÈLE MASTER - [GET]
    URL de test : https://seme-et-tisse.fr/API/api_volley_seance.php?action=delete_modele&id=1
==================================================================================================
*/

// Désactiver l'affichage des erreurs pour éviter de polluer le JSON
error_reporting(0);
ini_set('display_errors', 0);

// Identifiants de connexion : volontairement hors du depot Git.
// Copier config.example.php en config.php et y mettre les vraies valeurs.
require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(["success" => false, "error" => "Connexion échouée: " . $e->getMessage()]);
    exit;
}

/**
 * Les tables de charges sont créées à part (script SQL). Tant qu'elles
 * n'existent pas, les fonctionnalités liées se neutralisent au lieu de
 * provoquer une erreur SQL — la duplication d'une planif doit continuer
 * de fonctionner.
 */
function jsa_table_existe(PDO $pdo, $nom) {
    static $cache = [];
    if (isset($cache[$nom])) return $cache[$nom];
    try {
        $st = $pdo->prepare("SHOW TABLES LIKE ?");
        $st->execute([$nom]);
        $cache[$nom] = (bool)$st->fetchColumn();
    } catch (Exception $e) {
        $cache[$nom] = false;
    }
    return $cache[$nom];
}

$action = $_GET['action'] ?? '';

// --- AUTHENTIFICATION ---
if ($action == 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $pseudo = $data['pseudo'] ?? '';
    $pass = $data['password'] ?? '';
    $stmt = $pdo->prepare("SELECT id, nom, prenom, role FROM coachs WHERE pseudo = ? AND password = ?");
    $stmt->execute([$pseudo, $pass]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($user ? ["success" => true, "user" => $user] : ["success" => false, "message" => "Identifiants incorrects"]);
    exit;
}

switch($action) {
    case 'save_seance_score':
    $data = json_decode(file_get_contents("php://input"), true);
    // On récupère planif_id envoyé par le JS
    $planifId = intval($data['planif_id'] ?? 0);
    $type = $data['type'] ?? ''; 
    $itemId = intval($data['item_id'] ?? 0);
    $score = intval($data['score'] ?? 0);
    $today = date('Y-m-d');

    if ($planifId > 0 && $itemId > 0 && !empty($type)) {
        // Utilisation du nom de colonne exact : planif_equipe_id
        $sql = "INSERT INTO jsa_seance_validations (planif_equipe_id, item_type, item_id, date_validation, statut) 
                VALUES (?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE statut = VALUES(statut), date_validation = VALUES(date_validation)";
        
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([$planifId, $type, $itemId, $today, $score]);
        echo json_encode(["success" => $success, "newScore" => $score]);
    } else {
        echo json_encode(["success" => false, "error" => "Données incomplètes"]);
    }
    break;
    
    // --- ACTIONS GET ---
case 'get_team_events':
    $team_id = $_GET['team_id'];
    $player_id = $_GET['player_id'];
    // On récupère l'événement ET le statut actuel du joueur via une jointure
    $sql = "SELECT e.*, IFNULL(p.statut, 'En attente') as mon_statut 
            FROM vt_events e 
            LEFT JOIN vt_event_presence p ON e.id = p.event_id AND p.player_id = ?
            WHERE e.team_id = ? 
            ORDER BY e.date_event ASC, e.heure_event ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$player_id, $team_id]);
    echo json_encode($stmt->fetchAll());
    break;

// --- ACTIONS POST ---
case 'update_presence':
    $sql = "INSERT INTO vt_event_presence (event_id, player_id, statut) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE statut = VALUES(statut)";
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([$input['event_id'], $input['player_id'], $input['statut']]);
    echo json_encode(["status" => $success ? "success" : "error"]);
    break;
    
// --- ACTIONS ADMINISTRATION MASTER ---
case 'get_seance_validations':
        $id = intval($_GET['id'] ?? 0);
        $today = date('Y-m-d');
        
        try {
            $stmt = $pdo->prepare("SELECT item_type, item_id FROM jsa_seance_validations WHERE planif_equipe_id = ? AND date_validation = ?");
            $stmt->execute([$id, $today]);
            $validations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($validations);
        } catch (PDOException $e) {
            // Si la table n'existe pas encore, on renvoie un tableau vide au lieu d'une erreur 500
            echo json_encode([]);
        }
        break;

    case 'toggle_seance_item':
        $data = json_decode(file_get_contents("php://input"), true);
        $planifId = intval($data['planif_id'] ?? 0);
        $type = $data['type'] ?? ''; // 'objectif' ou 'theme'
        $itemId = intval($data['item_id'] ?? 0);
        $today = date('Y-m-d');

        if (!$planifId || !$type || !$itemId) {
            echo json_encode(["error" => "Données incomplètes"]);
            exit;
        }

        // On vérifie si l'item est déjà validé aujourd'hui
        $check = $pdo->prepare("SELECT id FROM jsa_seance_validations WHERE planif_equipe_id = ? AND item_type = ? AND item_id = ? AND date_validation = ?");
        $check->execute([$planifId, $type, $itemId, $today]);
        $existing = $check->fetch();

        if ($existing) {
            // On supprime la validation (Uncheck)
            $del = $pdo->prepare("DELETE FROM jsa_seance_validations WHERE id = ?");
            $del->execute([$existing['id']]);
            echo json_encode(["status" => "unlocked"]);
        } else {
            // On ajoute la validation (Check)
            $ins = $pdo->prepare("INSERT INTO jsa_seance_validations (planif_equipe_id, item_type, item_id, date_validation) VALUES (?, ?, ?, ?)");
            $ins->execute([$planifId, $type, $itemId, $today]);
            echo json_encode(["status" => "locked"]);
        }
        break;
    
case 'get_current_focus':
        $id = intval($_GET['id'] ?? 0);
        $cacheFile = 'vacances_cache.json';
        
        $targetWeek = intval($_GET['semaine_cible'] ?? date('W'));
        $targetYear = intval($_GET['annee_cible'] ?? date('Y'));

        $stDate = $pdo->prepare("SELECT date_debut FROM jsa_planif_equipe WHERE id = ?");
        $stDate->execute([$id]);
        $dateDebutStr = $stDate->fetchColumn();

        if (!$dateDebutStr) {
            echo json_encode(["error" => "Date manquante"]);
            exit;
        }

        // --- NORMALISATION DES DATES ---
        $tsStart = strtotime("Monday this week", strtotime($dateDebutStr));
        $dto = new DateTime();
        $dto->setISODate($targetYear, $targetWeek);
        $tsTarget = strtotime("Monday this week", $dto->getTimestamp());

        $isVacances = false;
        $vacancesWeeks = 0;
        $computedPeriods = []; 

        // --- CALCUL DU DÉCALAGE (Logique restaurée) ---
        if (file_exists($cacheFile)) {
            $vacs = json_decode(file_get_contents($cacheFile), true);
            if (is_array($vacs)) {
                foreach ($vacs as $v) {
                    // strtolower() travaille octet par octet : « Vacances d'Été »
                    // restait « vacances d'Été » et le filtre ne matchait jamais.
                    // Les vacances d'été etaient donc comptees comme une treve,
                    // ce qui decalait le debut de saison de deux semaines.
                    $desc = $v['description'] ?? '';
                    $descBas = function_exists('mb_strtolower')
                        ? mb_strtolower($desc, 'UTF-8')
                        : strtolower($desc);
                    if (str_contains($descBas, 'été') || str_contains($descBas, 'ete')) continue;

                    $tsVStart = strtotime("Monday this week", strtotime($v['start_date']));
                    $tsVEnd = strtotime("Monday this week", strtotime($v['end_date']));
                    $periodKey = $tsVStart . "_" . $tsVEnd;

                    // Vérification si la cible est en vacances
                    if ($tsTarget >= $tsVStart && $tsTarget < $tsVEnd) {
                        $isVacances = true;
                    }

                    // Comptage des semaines de pause pour décalage (Anti-doublons par periodKey)
                    if (!isset($computedPeriods[$periodKey])) {
                        if ($tsVEnd <= $tsTarget && $tsVStart >= $tsStart) {
                            $diffSec = $tsVEnd - $tsVStart;
                            $vacancesWeeks += round($diffSec / (86400 * 7));
                            $computedPeriods[$periodKey] = true;
                        }
                    }
                }
            }
        }

        // --- CALCUL PROGRESSION RÉELLE ---
        $totalWeeksRaw = round(($tsTarget - $tsStart) / (86400 * 7));
        $effectiveWeeks = max(0, $totalWeeksRaw - $vacancesWeeks); // Voilà le décalage !
        
        $currentCycleOrdre = floor($effectiveWeeks / 3) + 1;
        $currentWeekProg = ($effectiveWeeks % 3) + 1;

        $stmtC = $pdo->prepare("SELECT id FROM jsa_planif_equipe_cycles WHERE planif_equipe_id = ? AND ordre = ?");
        $stmtC->execute([$id, $currentCycleOrdre]);
        $cycle = $stmtC->fetch(PDO::FETCH_ASSOC);

        $res = [
            "currentCycle" => (int)$currentCycleOrdre,
            "currentWeek" => "S" . $currentWeekProg, // Format S1, S2, S3
            "isVacances" => $isVacances,
            "outOfBounds" => !$cycle,
            "semaine_calendaire" => $targetWeek,
            "debug_calc" => [
                "raw" => (int)$totalWeeksRaw,
                "vac" => (int)$vacancesWeeks,
                "eff" => (int)$effectiveWeeks
            ],
            "objectifs" => [],
            "themes" => []
        ];

        if ($cycle) {
            // Fetch Objectifs + Statut
            $stObj = $pdo->prepare("
                SELECT o.id, o.titre, o.description, o.secteur_id, s.nom as secteur_nom,
                COALESCE((SELECT statut FROM jsa_seance_validations WHERE planif_equipe_id = ? AND item_id = o.id AND item_type = 'objectif' LIMIT 1), 0) as statut
                FROM jsa_objectifs o 
                JOIN jsa_planif_equipe_objectifs p ON o.id = p.objectif_id 
                JOIN jsa_secteurs s ON o.secteur_id = s.id
                WHERE p.cycle_id = ?
                ORDER BY s.id ASC
            ");
            $stObj->execute([$id, $cycle['id']]);
            $res["objectifs"] = $stObj->fetchAll(PDO::FETCH_ASSOC);

            // Fetch Thèmes + Statut
            $stTh = $pdo->prepare("
                SELECT t.id, t.nom_theme as nom, t.description, t.secteur_id, s.nom as secteur_nom, st.sous_themes_ids,
                COALESCE((SELECT statut FROM jsa_seance_validations WHERE planif_equipe_id = ? AND item_id = t.id AND item_type = 'theme' LIMIT 1), 0) as statut
                FROM jsa_planif_equipe_themes st 
                JOIN jsa_themes t ON st.theme_id = t.id 
                JOIN jsa_secteurs s ON t.secteur_id = s.id 
                WHERE st.cycle_id = ? AND st.num_semaine = ?
            ");
            $stTh->execute([$id, $cycle['id'], $currentWeekProg]);
            $res["themes"] = $stTh->fetchAll(PDO::FETCH_ASSOC);

            foreach($res["themes"] as &$th) {
                // ... (Reste de la récupération des sous-thèmes et conseils identique)
                $stST = $pdo->prepare("SELECT st.nom_sous_theme FROM jsa_planif_equipe_theme_details ptd JOIN jsa_sous_themes st ON ptd.sous_theme_id = st.id WHERE ptd.equipe_theme_id = (SELECT id FROM jsa_planif_equipe_themes WHERE cycle_id = ? AND num_semaine = ? AND theme_id = ? LIMIT 1)");
                $stST->execute([$cycle['id'], $currentWeekProg, $th['id']]);
                $th['sous_themes_selectionnes'] = $stST->fetchAll(PDO::FETCH_COLUMN);
                
                $stC = $pdo->prepare("SELECT conseil FROM jsa_themes_conseil WHERE theme_id = ? LIMIT 1");
                $stC->execute([$th['id']]);
                $th['conseil_coach'] = $stC->fetchColumn();
            }
        }
        echo json_encode($res);
        break;
        
case 'get_admin_full_data':
    try {
        // Correction : Utilisation de $pdo au lieu de $db
        $stmtS = $pdo->query("SELECT id, nom, code FROM jsa_secteurs ORDER BY id ASC");
        $secteurs = $stmtS->fetchAll(PDO::FETCH_ASSOC);

        if (!$secteurs) {
            echo json_encode([]);
            exit;
        }

        foreach ($secteurs as &$s) {
            $sId = (int)$s['id'];

            // 2. Thèmes
            $stmtT = $pdo->prepare("SELECT id, nom_theme, description,secteur_id FROM jsa_themes WHERE secteur_id = ?");
            $stmtT->execute([$sId]);
            $s['themes'] = $stmtT->fetchAll(PDO::FETCH_ASSOC);

            // 3. Objectifs
            $stmtO = $pdo->prepare("SELECT id, titre, description, secteur_id FROM jsa_objectifs WHERE secteur_id = ?");
            $stmtO->execute([$sId]);
            $s['objectifs'] = $stmtO->fetchAll(PDO::FETCH_ASSOC);

            // 4. Sous-thèmes et Conseils
            foreach ($s['themes'] as &$t) {
                $tId = (int)$t['id'];

                $stmtST = $pdo->prepare("SELECT id, nom_sous_theme, description,theme_id FROM jsa_sous_themes WHERE theme_id = ?");
                $stmtST->execute([$tId]);
                $t['sous_themes'] = $stmtST->fetchAll(PDO::FETCH_ASSOC);

                $stmtC = $pdo->prepare("SELECT id, conseil, theme_id FROM jsa_themes_conseil WHERE theme_id = ?");
                $stmtC->execute([$tId]);
                $t['conseils'] = $stmtC->fetchAll(PDO::FETCH_ASSOC);
            }
        }
        echo json_encode($secteurs);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    break;

case 'admin_delete_item':
    $data = json_decode(file_get_contents('php://input'), true);
    $table = $data['table'] ?? '';
    $id = intval($data['id'] ?? 0);

    $allowedTables = ['jsa_secteurs', 'jsa_themes', 'jsa_sous_themes', 'jsa_objectifs', 'jsa_themes_conseil'];
    if (!in_array($table, $allowedTables)) {
        echo json_encode(['success' => false, 'error' => 'Table non autorisée']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
    $success = $stmt->execute([$id]);

    echo json_encode(['success' => $success]);
    break;
case 'admin_save_item':
    $data = json_decode(file_get_contents('php://input'), true);
    $table = $data['table'] ?? '';
    $item = $data['item'] ?? null;
    $id = isset($item['id']) ? intval($item['id']) : null;

    $allowedTables = ['jsa_secteurs', 'jsa_themes', 'jsa_sous_themes', 'jsa_objectifs', 'jsa_themes_conseil'];
    if (!in_array($table, $allowedTables)) {
        echo json_encode(['success' => false, 'error' => 'Table non autorisée : ' . $table]);
        exit;
    }

    // On définit strictement les colonnes physiques de ta BDD
  $schema = [
            'jsa_secteurs' => ['nom', 'code'],
            'jsa_themes' => ['nom_theme', 'secteur_id', 'description'],
            'jsa_sous_themes' => ['nom_sous_theme', 'theme_id', 'description'],
            'jsa_objectifs' => ['titre', 'description', 'secteur_id'],
            'jsa_themes_conseil' => ['conseil', 'theme_id']
        ];

    $cleanItem = [];
    foreach ($item as $key => $val) {
        if (in_array($key, $schema[$table])) {
            $cleanItem[$key] = $val;
        }
    }

    try {
        if ($id) {
            $fields = [];
            $values = [];
            foreach ($cleanItem as $key => $val) {
                $fields[] = "$key = ?";
                $values[] = $val;
            }
            $values[] = $id;
            $stmt = $pdo->prepare("UPDATE $table SET " . implode(', ', $fields) . " WHERE id = ?");
            $success = $stmt->execute($values);
        } else {
            $fields = array_keys($cleanItem);
            $placeholders = array_fill(0, count($fields), '?');
            $stmt = $pdo->prepare("INSERT INTO $table (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")");
            $success = $stmt->execute(array_values($cleanItem));
        }
        echo json_encode(['success' => $success]);
    } catch (PDOException $e) {
        // C'EST ICI QUE TU VERRAS LE PROBLÈME DANS L'ONGLET NETWORK
        echo json_encode(['success' => false, 'error' => 'Erreur SQL : ' . $e->getMessage(), 'debug_item' => $cleanItem]);
    }
    break;
    
    // --- SECTEURS & OBJECTIFS (Indispensable Studio) ---
    case 'get_secteurs':
        $stmt = $pdo->query("SELECT id, nom, code FROM jsa_secteurs ORDER BY id ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_objectifs_pedago':
        $secteur_id = $_GET['secteur_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT id, titre, description FROM jsa_objectifs WHERE secteur_id = ?");
        $stmt->execute([$secteur_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_themes_complet':
        $secteur_id = $_GET['secteur_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT id, nom_theme, description FROM jsa_themes WHERE secteur_id = ?");
        $stmt->execute([$secteur_id]);
        $themes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($themes as &$t) {
            $s1 = $pdo->prepare("SELECT conseil FROM jsa_themes_conseil WHERE theme_id = ?");
            $s1->execute([$t['id']]);
            $t['conseils'] = $s1->fetchAll(PDO::FETCH_COLUMN);
            $s2 = $pdo->prepare("SELECT id, nom_sous_theme, description FROM jsa_sous_themes WHERE theme_id = ?");
            $s2->execute([$t['id']]);
            $t['sous_themes'] = $s2->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode($themes);
        break;

    // --- GESTION DES MODÈLES (MASTER) ---
    case 'get_modeles_liste':
        // Un modèle masqué reste utilisable par l'admin mais disparaît du
        // catalogue des coachs : c'est un rangement, pas une sécurité.
        // La colonne `visible` peut manquer si le SQL n'a pas encore été passé :
        // dans ce cas tout est visible, l'application continue de fonctionner.
        $aVisible = (bool) $pdo->query(
            "SHOW COLUMNS FROM jsa_planif_modele LIKE 'visible'"
        )->fetch(PDO::FETCH_ASSOC);
        $tous = !empty($_GET['tous']);

        if (!$aVisible) {
            $stmt = $pdo->query("SELECT id, nom, niveau, 1 AS visible FROM jsa_planif_modele ORDER BY id DESC");
        } elseif ($tous) {
            $stmt = $pdo->query("SELECT id, nom, niveau, visible FROM jsa_planif_modele ORDER BY id DESC");
        } else {
            $stmt = $pdo->query("SELECT id, nom, niveau, visible FROM jsa_planif_modele WHERE visible = 1 ORDER BY id DESC");
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'set_modele_visible':
        $data = json_decode(file_get_contents("php://input"), true);
        $id = intval($data['id'] ?? 0);
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Identifiant manquant"]);
            break;
        }
        $aVisible = (bool) $pdo->query(
            "SHOW COLUMNS FROM jsa_planif_modele LIKE 'visible'"
        )->fetch(PDO::FETCH_ASSOC);
        if (!$aVisible) {
            echo json_encode([
                "success" => false,
                "error" => "La colonne `visible` n'existe pas encore : "
                         . "ALTER TABLE jsa_planif_modele ADD COLUMN visible TINYINT(1) NOT NULL DEFAULT 1;"
            ]);
            break;
        }
        $st = $pdo->prepare("UPDATE jsa_planif_modele SET visible = ? WHERE id = ?");
        $st->execute([empty($data['visible']) ? 0 : 1, $id]);
        echo json_encode(["success" => true]);
        break;

case 'save_planif_equipe':
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data['id'])) {
        echo json_encode(["success" => false, "error" => "Données manquantes"]);
        break;
    }

    $planif_id = intval($data['id']);
    // Correction ici : on récupère la valeur, le nom de la variable importe peu
    $nom_valeur = $data['nom']; 
    $niveau = $data['niveau'];

    try {
        $pdo->beginTransaction();

        // 1. MISE À JOUR : Correction du nom de la colonne (nom au lieu de nom_equipe)
        $stmt = $pdo->prepare("UPDATE jsa_planif_equipe SET nom = ?, niveau = ? WHERE id = ?");
        $stmt->execute([$nom_valeur, $niveau, $planif_id]);

        if (isset($data['cycles']) && is_array($data['cycles'])) {
            foreach ($data['cycles'] as $cycle) {
                $cycle_id = intval($cycle['id']);
                $ordre = intval($cycle['ordre']);
                $secteur_ids = json_encode($cycle['secteur_ids']);

                // 2. Mise à jour ou Insertion du Cycle
                if (strpos($cycle['id'], 'new_') !== false) {
                    $stmtCycle = $pdo->prepare("INSERT INTO jsa_planif_equipe_cycles (planif_equipe_id, ordre, secteur_ids) VALUES (?, ?, ?)");
                    $stmtCycle->execute([$planif_id, $ordre, $secteur_ids]);
                    $cycle_id = $pdo->lastInsertId();
                } else {
                    $stmtCycle = $pdo->prepare("UPDATE jsa_planif_equipe_cycles SET ordre = ?, secteur_ids = ? WHERE id = ?");
                    $stmtCycle->execute([$ordre, $secteur_ids, $cycle_id]);
                }

                // 3. Gestion des Objectifs
                $pdo->prepare("DELETE FROM jsa_planif_equipe_objectifs WHERE cycle_id = ?")->execute([$cycle_id]);
                if (!empty($cycle['objectifs'])) {
                    $stmtObj = $pdo->prepare("INSERT INTO jsa_planif_equipe_objectifs (cycle_id, objectif_id) VALUES (?, ?)");
                    foreach ($cycle['objectifs'] as $obj_id) {
                        $stmtObj->execute([$cycle_id, intval($obj_id)]);
                    }
                }

                // 4. Gestion des Semaines et Thèmes
                $pdo->prepare("DELETE FROM jsa_planif_equipe_themes WHERE cycle_id = ?")->execute([$cycle_id]);
                
                if (!empty($cycle['semaines'])) {
                    foreach ($cycle['semaines'] as $sem) {
                        $num_semaine = intval($sem['num']);
                        if (!empty($sem['themes'])) {
                            foreach ($sem['themes'] as $theme) {
                                $theme_id = intval($theme['id']);
                                $sous_themes = json_encode($theme['sous_themes']);
                                
                                $stmtTh = $pdo->prepare("INSERT INTO jsa_planif_equipe_themes (cycle_id, num_semaine, theme_id, sous_themes_ids) VALUES (?, ?, ?, ?)");
                                $stmtTh->execute([$cycle_id, $num_semaine, $theme_id, json_encode($theme['sous_themes'])]);
                            }
                        }
                    }
                }
            }
        }

        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Planification d'équipe mise à jour"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    break;
    
    case 'save_modele':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || empty($data['nom'])) { echo json_encode(["success" => false, "error" => "Données incomplètes"]); exit; }
        try {
            $pdo->beginTransaction();
            $modeleId = $data['id'] ?? null;
            $niveau = $data['niveau'] ?? 'débutant';
            if ($modeleId) {
                $pdo->prepare("UPDATE jsa_planif_modele SET nom = ?, niveau = ? WHERE id = ?")->execute([$data['nom'], $niveau, $modeleId]);
                $pdo->prepare("DELETE FROM jsa_planif_cycles WHERE modele_id = ?")->execute([$modeleId]);
            } else {
                $st = $pdo->prepare("INSERT INTO jsa_planif_modele (nom, niveau) VALUES (?, ?)");
                $st->execute([$data['nom'], $niveau]);
                $modeleId = $pdo->lastInsertId();
            }
            foreach ($data['cycles'] as $cycle) {
                $secJson = json_encode($cycle['secteur_ids']);
                $stC = $pdo->prepare("INSERT INTO jsa_planif_cycles (modele_id, secteur_ids, ordre) VALUES (?, ?, ?)");
                $stC->execute([$modeleId, $secJson, $cycle['ordre']]);
                $cycleId = $pdo->lastInsertId();
                if (!empty($cycle['objectifs'])) {
                    $stObj = $pdo->prepare("INSERT INTO jsa_planif_cycle_objectifs (cycle_id, objectif_id) VALUES (?, ?)");
                    foreach ($cycle['objectifs'] as $o) $stObj->execute([$cycleId, $o]);
                }
                foreach ($cycle['semaines'] as $sem) {
                    if (empty($sem['themes'])) continue;
                    foreach ($sem['themes'] as $th) {
                        $sousThemes = array_map('intval', $th['sous_themes'] ?? []);
                        // On alimente AUSSI sous_themes_ids : c'est cette colonne que
                        // lisent get_full_modele et get_full_planif_equipe. Sans elle,
                        // les sous-themes restaient invisibles dans le Studio.
                        $stTh = $pdo->prepare("INSERT INTO jsa_planif_semaine_themes (cycle_id, num_semaine, theme_id, sous_themes_ids) VALUES (?, ?, ?, ?)");
                        $stTh->execute([$cycleId, $sem['num'], $th['id'], json_encode($sousThemes)]);
                        $sThId = $pdo->lastInsertId();
                        if (!empty($sousThemes)) {
                            $stSt = $pdo->prepare("INSERT INTO jsa_planif_theme_details (semaine_theme_id, sous_theme_id) VALUES (?, ?)");
                            foreach ($sousThemes as $st) $stSt->execute([$sThId, $st]);
                        }
                    }
                }
            }
            $pdo->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) { $pdo->rollBack(); echo json_encode(["success" => false, "error" => $e->getMessage()]); }
        break;


    // --- MON ÉQUIPE (PLANIFICATIONS RÉELLES) ---
    case 'get_coach_teams':
        $coachId = intval($_GET['coach_id'] ?? 0);
        $stU = $pdo->prepare("SELECT equipes_autorisees, role FROM coachs WHERE id = ?");
        $stU->execute([$coachId]);
        $u = $stU->fetch(PDO::FETCH_ASSOC);
        if ($u['role'] === 'admin') {
            $st = $pdo->query("SELECT id, nom_equipe as name FROM vt_teams ORDER BY nom_equipe ASC");
        } else {
            $ids = trim($u['equipes_autorisees'] ?? '');
            if (empty($ids)) { echo json_encode([]); exit; }
            $clean = implode(',', array_map('intval', explode(',', $ids)));
            $st = $pdo->query("SELECT id, nom_equipe as name FROM vt_teams WHERE id IN ($clean) ORDER BY nom_equipe ASC");
        }
        echo json_encode($st->fetchAll(PDO::FETCH_ASSOC));
        break;
        
case 'get_full_modele':
    case 'get_full_planif_equipe':
        $id = intval($_GET['id'] ?? 0);
        $isEquipe = ($action === 'get_full_planif_equipe');
        header('Content-Type: application/json');

        // Définition dynamique des tables pour supporter les deux modes
        $tBase        = $isEquipe ? 'jsa_planif_equipe' : 'jsa_planif_modele';
        $tCycles      = $isEquipe ? 'jsa_planif_equipe_cycles' : 'jsa_planif_cycles';
        $fkCol        = $isEquipe ? 'planif_equipe_id' : 'modele_id';
        $tObjLiaison  = $isEquipe ? 'jsa_planif_equipe_objectifs' : 'jsa_planif_cycle_objectifs';
        $tThemes      = $isEquipe ? 'jsa_planif_equipe_themes' : 'jsa_planif_semaine_themes';
        
        try {
            // 1. Infos de base (Nom, Niveau, etc.)
            $stmt = $pdo->prepare("SELECT * FROM $tBase WHERE id = ?");
            $stmt->execute([$id]);
            $modele = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$modele) { echo json_encode(["error" => "Inconnu"]); exit; }

            // Map des secteurs pour les labels
            $resS = $pdo->query("SELECT id, nom FROM jsa_secteurs");
            $secteursMap = $resS->fetchAll(PDO::FETCH_KEY_PAIR);

            // 2. Récupération des Cycles
            $stmtC = $pdo->prepare("SELECT * FROM $tCycles WHERE $fkCol = ? ORDER BY ordre ASC");
            $stmtC->execute([$id]);
            $cycles = $stmtC->fetchAll(PDO::FETCH_ASSOC);

            foreach ($cycles as &$cycle) {
                // Décodage des secteurs du cycle
                $sIds = json_decode($cycle['secteur_ids'], true) ?: [];
                $cycle['secteur_ids'] = $sIds;
                
                // 3. Récupération des Objectifs du cycle (Liaison dynamique)
                // Note : On utilise $tObjLiaison pour que ça marche en Master ET en Equipe
                $stObj = $pdo->prepare("
                    SELECT o.id, o.titre, o.description, s.nom as secteur_nom, s.id as secteur_id
                    FROM jsa_objectifs o 
                    JOIN $tObjLiaison p ON o.id = p.objectif_id 
                    JOIN jsa_secteurs s ON o.secteur_id = s.id 
                    WHERE p.cycle_id = ? 
                    ORDER BY s.id ASC
                ");
                $stObj->execute([$cycle['id']]);
                $cycle['objectifs_selectionnes'] = $stObj->fetchAll(PDO::FETCH_ASSOC);

                $cycle['semaines'] = [];
                for ($i = 1; $i <= 3; $i++) {
                    // 4. Récupération des Thèmes de la semaine (Liaison dynamique)
                    // Utilisation de $tThemes pour switcher entre jsa_planif_equipe_themes et jsa_planif_semaine_themes
                    $stTh = $pdo->prepare("
                        SELECT t.id, t.nom_theme as nom, t.description, s.nom as secteur_nom, s.id as secteur_id, st.sous_themes_ids 
                        FROM $tThemes st 
                        JOIN jsa_themes t ON st.theme_id = t.id 
                        JOIN jsa_secteurs s ON t.secteur_id = s.id 
                        WHERE st.cycle_id = ? AND st.num_semaine = ?
                    ");
                    $stTh->execute([$cycle['id'], $i]);
                    $themes = $stTh->fetchAll(PDO::FETCH_ASSOC);
                    
                    foreach ($themes as &$theme) {
                        // 5. Sous-thèmes sélectionnés
                        // On privilégie la colonne JSON 'sous_themes_ids' si elle est remplie
                        $theme['sous_themes_selectionnes'] = json_decode($theme['sous_themes_ids'] ?? '[]', true);
                        
                        // Si le JSON est vide, on cherche dans l'ancienne table de détails (compatibilité)
                        if (empty($theme['sous_themes_selectionnes'])) {
                            // Ici on ne fait pas de requête complexe car le nouveau système JSON est prioritaire
                            $theme['sous_themes_selectionnes'] = [];
                        }

                        // 6. Conseil Coach (lié au thème global)
                        $s4 = $pdo->prepare("SELECT conseil FROM jsa_themes_conseil WHERE theme_id = ? LIMIT 1");
                        $s4->execute([$theme['id']]);
                        $theme['conseil_coach'] = $s4->fetchColumn() ?: null;
                    }
                    $cycle['semaines'][] = ["num" => $i, "themes_details" => $themes];
                }
            }
            
            $modele['cycles'] = $cycles;
            echo json_encode($modele);

        } catch (PDOException $e) {
            echo json_encode(["error" => "Erreur SQL : " . $e->getMessage()]);
        }
        exit;
        
case 'get_equipe_planifs':
        $coachId = intval($_GET['coach_id'] ?? 0);
        $stU = $pdo->prepare("SELECT equipes_autorisees, role FROM coachs WHERE id = ?");
        $stU->execute([$coachId]);
        $u = $stU->fetch(PDO::FETCH_ASSOC);
        if (!$u) { echo json_encode([]); exit; }

        // On s'assure de bien sélectionner date_debut (qui doit exister dans jsa_planif_equipe)
        $sql = "SELECT p.*, t.nom_equipe FROM jsa_planif_equipe p JOIN vt_teams t ON p.equipe_id = t.id";
        
        if ($u['role'] !== 'admin') {
            $ids = trim($u['equipes_autorisees'] ?? '');
            if (!empty($ids)) {
                $clean = implode(',', array_map('intval', explode(',', $ids)));
                $sql .= " WHERE p.equipe_id IN ($clean)";
            } else {
                echo json_encode([]); exit;
            }
        }
        
        $sql .= " ORDER BY p.date_creation DESC";
        echo json_encode($pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'update_planif_date':
        // Action pour sauvegarder la date de début modifiée sur l'interface
        $data = json_decode(file_get_contents("php://input"), true);
        $id = intval($data['id'] ?? 0);
        $date = $data['date_debut'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("UPDATE jsa_planif_equipe SET date_debut = ? WHERE id = ?");
            $success = $stmt->execute([$date, $id]);
            echo json_encode(["success" => $success]);
        } else {
            echo json_encode(["success" => false, "error" => "ID manquant"]);
        }
        break;
        
case 'update_planif_date':
    $data = json_decode(file_get_contents("php://input"), true);
    $id = intval($data['id']);
    $date = $data['date_debut'];
    
    $stmt = $pdo->prepare("UPDATE jsa_planif_equipe SET date_debut = ? WHERE id = ?");
    $success = $stmt->execute([$date, $id]);
    echo json_encode(["success" => $success]);
    break;
    // --- CHARGES DE TRAVAIL (repartition du temps) ---------------------
    case 'get_types_travail':
        if (!jsa_table_existe($pdo, 'jsa_types_travail')) {
            echo json_encode([]);
            break;
        }
        $st = $pdo->query("SELECT id, famille, nom, code, ordre FROM jsa_types_travail ORDER BY ordre ASC");
        echo json_encode($st->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_charges':
        // ?id=<planif ou modele>&mode=modele|equipe
        $id = intval($_GET['id'] ?? 0);
        $estEquipe = (($_GET['mode'] ?? 'modele') === 'equipe');
        $tCharges = $estEquipe ? 'jsa_planif_equipe_charges' : 'jsa_planif_cycle_charges';
        $tCycles  = $estEquipe ? 'jsa_planif_equipe_cycles' : 'jsa_planif_cycles';
        $fk       = $estEquipe ? 'planif_equipe_id' : 'modele_id';

        if (!$id || !jsa_table_existe($pdo, $tCharges)) {
            echo json_encode([]);
            break;
        }
        $st = $pdo->prepare("
            SELECT ch.cycle_id, c.ordre AS cycle_ordre, ch.num_semaine, ch.niveau,
                   ch.famille, ch.theme_id, ch.type_travail_id, ch.pourcentage
            FROM $tCharges ch
            JOIN $tCycles c ON c.id = ch.cycle_id
            WHERE c.$fk = ?
            ORDER BY c.ordre, ch.num_semaine, ch.niveau
        ");
        $st->execute([$id]);
        echo json_encode($st->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'save_charges':
        // { id, mode, charges: [{cycle_id, num_semaine, niveau, famille, theme_id, type_travail_id, pourcentage}] }
        $data = json_decode(file_get_contents("php://input"), true);
        $id = intval($data['id'] ?? 0);
        $estEquipe = (($data['mode'] ?? 'modele') === 'equipe');
        $tCharges = $estEquipe ? 'jsa_planif_equipe_charges' : 'jsa_planif_cycle_charges';
        $tCycles  = $estEquipe ? 'jsa_planif_equipe_cycles' : 'jsa_planif_cycles';
        $fk       = $estEquipe ? 'planif_equipe_id' : 'modele_id';

        if (!$id) {
            echo json_encode(["success" => false, "error" => "id manquant"]);
            break;
        }
        if (!jsa_table_existe($pdo, $tCharges)) {
            echo json_encode([
                "success" => false,
                "error" => "Table $tCharges absente : le script SQL de création n'a pas encore été passé."
            ]);
            break;
        }

        try {
            $pdo->beginTransaction();

            // On ne touche qu'aux cycles de CETTE planification.
            $stC = $pdo->prepare("SELECT id FROM $tCycles WHERE $fk = ?");
            $stC->execute([$id]);
            $cyclesValides = array_map('intval', $stC->fetchAll(PDO::FETCH_COLUMN));

            if ($cyclesValides) {
                $in = implode(',', $cyclesValides);
                $pdo->exec("DELETE FROM $tCharges WHERE cycle_id IN ($in)");
            }

            $ins = $pdo->prepare("INSERT INTO $tCharges
                (cycle_id, num_semaine, niveau, famille, theme_id, type_travail_id, pourcentage)
                VALUES (?, ?, ?, ?, ?, ?, ?)");

            $n = 0;
            foreach (($data['charges'] ?? []) as $ch) {
                $cid = intval($ch['cycle_id'] ?? 0);
                if (!in_array($cid, $cyclesValides, true)) continue; // cycle etranger : ignore
                $ins->execute([
                    $cid,
                    intval($ch['num_semaine'] ?? 0),
                    intval($ch['niveau'] ?? 0),
                    $ch['famille'] ?? '',
                    intval($ch['theme_id'] ?? 0),
                    intval($ch['type_travail_id'] ?? 0),
                    round(floatval($ch['pourcentage'] ?? 0), 2),
                ]);
                $n++;
            }

            $pdo->commit();
            echo json_encode(["success" => true, "enregistrees" => $n]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'delete_planif_equipe':
        $data = json_decode(file_get_contents("php://input"), true);
        $planifId = intval($data['id'] ?? 0);
        $coachId  = intval($data['coach_id'] ?? 0);

        if (!$planifId || !$coachId) {
            echo json_encode(["success" => false, "error" => "id et coach_id sont requis"]);
            break;
        }

        // Verification de propriete : un coach ne supprime que ses planifs,
        // un admin peut tout supprimer. (Garde-fou applicatif : l'API n'a pas
        // encore de session, cf. README.)
        $stOwner = $pdo->prepare("SELECT coach_id FROM jsa_planif_equipe WHERE id = ?");
        $stOwner->execute([$planifId]);
        $proprietaire = $stOwner->fetchColumn();

        if ($proprietaire === false) {
            echo json_encode(["success" => false, "error" => "Planification introuvable"]);
            break;
        }

        $stRole = $pdo->prepare("SELECT role FROM coachs WHERE id = ?");
        $stRole->execute([$coachId]);
        $role = $stRole->fetchColumn();

        if (intval($proprietaire) !== $coachId && $role !== 'admin') {
            echo json_encode(["success" => false, "error" => "Cette planification ne vous appartient pas"]);
            break;
        }

        try {
            $pdo->beginTransaction();

            // Les tables enfants n'ont pas de ON DELETE CASCADE (sauf les
            // cycles) : on nettoie explicitement du plus profond au plus haut,
            // sinon on laisse des lignes orphelines en base.

            // 1. Sous-themes coches
            $pdo->prepare("
                DELETE td FROM jsa_planif_equipe_theme_details td
                JOIN jsa_planif_equipe_themes t ON t.id = td.equipe_theme_id
                JOIN jsa_planif_equipe_cycles c ON c.id = t.cycle_id
                WHERE c.planif_equipe_id = ?
            ")->execute([$planifId]);

            // 2. Themes des semaines
            $pdo->prepare("
                DELETE t FROM jsa_planif_equipe_themes t
                JOIN jsa_planif_equipe_cycles c ON c.id = t.cycle_id
                WHERE c.planif_equipe_id = ?
            ")->execute([$planifId]);

            // 3. Objectifs des cycles
            $pdo->prepare("
                DELETE o FROM jsa_planif_equipe_objectifs o
                JOIN jsa_planif_equipe_cycles c ON c.id = o.cycle_id
                WHERE c.planif_equipe_id = ?
            ")->execute([$planifId]);

            // 4. Notes saisies sur le terrain
            $pdo->prepare("DELETE FROM jsa_seance_validations WHERE planif_equipe_id = ?")
                ->execute([$planifId]);

            // 5. Cycles
            $pdo->prepare("DELETE FROM jsa_planif_equipe_cycles WHERE planif_equipe_id = ?")
                ->execute([$planifId]);

            // 6. La planification elle-meme
            $pdo->prepare("DELETE FROM jsa_planif_equipe WHERE id = ?")->execute([$planifId]);

            $pdo->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'duplicate_to_team':
        $data = json_decode(file_get_contents("php://input"), true);

        // Garde-fou : sans ces 3 champs on creait une ligne orpheline inutilisable.
        $modeleId = intval($data['modele_id'] ?? 0);
        $equipeId = intval($data['equipe_id'] ?? 0);
        $coachId  = intval($data['coach_id'] ?? 0);
        $saison   = $data['saison'] ?? null;
        if (!$modeleId || !$equipeId || !$coachId) {
            echo json_encode([
                "success" => false,
                "error" => "modele_id, equipe_id et coach_id sont requis"
            ]);
            break;
        }

        try {
            $pdo->beginTransaction();
            $stM = $pdo->prepare("SELECT nom, niveau FROM jsa_planif_modele WHERE id = ?");
            $stM->execute([$modeleId]);
            $m = $stM->fetch(PDO::FETCH_ASSOC);
            if (!$m) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "error" => "Modele introuvable"]);
                break;
            }

            // Le coach peut nommer sa planification des la copie ; a defaut on
            // reprend le nom du modele.
            $nomPlanif = trim($data['nom'] ?? '');
            if ($nomPlanif === '') { $nomPlanif = $m['nom']; }

            $insE = $pdo->prepare("INSERT INTO jsa_planif_equipe (nom, niveau, equipe_id, saison, coach_id) VALUES (?, ?, ?, ?, ?)");
            $insE->execute([$nomPlanif, $m['niveau'], $equipeId, $saison, $coachId]);
            $newPId = $pdo->lastInsertId();
            $stC = $pdo->prepare("SELECT * FROM jsa_planif_cycles WHERE modele_id = ?");
            $stC->execute([$modeleId]);
            $mapCycles = []; // ancien cycle du modele -> nouveau cycle de l'equipe
            while ($c = $stC->fetch(PDO::FETCH_ASSOC)) {
                $insC = $pdo->prepare("INSERT INTO jsa_planif_equipe_cycles (planif_equipe_id, secteur_ids, ordre) VALUES (?, ?, ?)");
                $insC->execute([$newPId, $c['secteur_ids'], $c['ordre']]);
                $newCId = $pdo->lastInsertId();
                $mapCycles[intval($c['id'])] = intval($newCId);
                $pdo->exec("INSERT INTO jsa_planif_equipe_objectifs (cycle_id, objectif_id) SELECT $newCId, objectif_id FROM jsa_planif_cycle_objectifs WHERE cycle_id = {$c['id']}");
                $stT = $pdo->prepare("SELECT * FROM jsa_planif_semaine_themes WHERE cycle_id = ?");
                $stT->execute([$c['id']]);
                while ($t = $stT->fetch(PDO::FETCH_ASSOC)) {
                    // sous_themes_ids doit suivre la copie, sinon la planif d'equipe
                    // perd l'affichage de ses sous-themes dans le Studio.
                    $insT = $pdo->prepare("INSERT INTO jsa_planif_equipe_themes (cycle_id, num_semaine, theme_id, sous_themes_ids) VALUES (?, ?, ?, ?)");
                    $insT->execute([$newCId, $t['num_semaine'], $t['theme_id'], $t['sous_themes_ids'] ?? '[]']);
                    $newTId = $pdo->lastInsertId();
                    $pdo->exec("INSERT INTO jsa_planif_equipe_theme_details (equipe_theme_id, sous_theme_id) SELECT $newTId, sous_theme_id FROM jsa_planif_theme_details WHERE semaine_theme_id = {$t['id']}");
                }
            }

            // Report des charges de travail. Encadre par un test d'existence :
            // tant que le script SQL n'a pas ete passe, la duplication doit
            // continuer de fonctionner normalement.
            if ($mapCycles
                && jsa_table_existe($pdo, 'jsa_planif_cycle_charges')
                && jsa_table_existe($pdo, 'jsa_planif_equipe_charges')) {
                $stCh = $pdo->prepare("SELECT * FROM jsa_planif_cycle_charges WHERE cycle_id = ?");
                $insCh = $pdo->prepare("INSERT INTO jsa_planif_equipe_charges
                    (cycle_id, num_semaine, niveau, famille, theme_id, type_travail_id, pourcentage)
                    VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($mapCycles as $ancien => $nouveau) {
                    $stCh->execute([$ancien]);
                    while ($ch = $stCh->fetch(PDO::FETCH_ASSOC)) {
                        $insCh->execute([
                            $nouveau, $ch['num_semaine'], $ch['niveau'], $ch['famille'],
                            $ch['theme_id'], $ch['type_travail_id'], $ch['pourcentage'],
                        ]);
                    }
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "id" => $newPId]);
        } catch (Exception $e) { $pdo->rollBack(); echo json_encode(["success" => false, "error" => $e->getMessage()]); }
        break;

    case 'delete_modele':
        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(["success" => false, "error" => "Identifiant manquant"]);
            break;
        }
        // Les cycles ne partaient pas avec le modèle : la table gardait des
        // lignes rattachées à un modèle disparu, ainsi que leurs semaines,
        // leurs objectifs et leurs charges. On supprime l'arbre d'abord.
        try {
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM jsa_planif_cycles WHERE modele_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM jsa_planif_modele WHERE id = ?")->execute([$id]);
            $pdo->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(["message" => "Action non reconnue"]);
        break;
}