-- Visibilité des modèles pour les entraîneurs.
--
-- Un modèle masqué reste modifiable par l'admin mais n'apparaît plus dans le
-- catalogue des coachs. C'est un rangement, pas une sécurité : l'API n'ayant
-- pas d'authentification, le filtre ne protège rien, il désencombre.
--
-- Tant que cette colonne n'existe pas, l'application continue de fonctionner :
-- get_modeles_liste renvoie alors tout le monde comme visible, et le bouton
-- de bascule répond en rappelant la commande à passer.

ALTER TABLE jsa_planif_modele
    ADD COLUMN visible TINYINT(1) NOT NULL DEFAULT 1;
