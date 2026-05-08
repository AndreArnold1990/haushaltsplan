/// <summary>
/// ScriptableObject representing a single item in the Herbalis world (herb, potion, crystal, etc.).
/// Acts as the canonical data record for any collectible or craftable. InventorySystem uses
/// ItemSO instances as dictionary keys, so one asset = one unique item type.
/// Create via: Assets > Create > Herbalis > Item
/// </summary>

using UnityEngine;

namespace Herbalis.Data
{
    public enum ItemRarity { Common, Uncommon, Rare, Epic }

    [CreateAssetMenu(fileName = "NewItem", menuName = "Herbalis/Item")]
    public class ItemSO : ScriptableObject
    {
        [Header("Identity")]
        public string itemName;
        [TextArea(2, 4)]
        public string description;

        [Header("Presentation")]
        public Sprite icon;

        [Header("Stats")]
        public ItemRarity rarity;
        public int baseValue;
    }
}
