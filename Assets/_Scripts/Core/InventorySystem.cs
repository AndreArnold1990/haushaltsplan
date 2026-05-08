/// <summary>
/// Manages the player's item inventory as a Dictionary&lt;ItemSO, int&gt; stack map.
/// Purely data-layer — raises OnInventoryChanged so UI and systems react without
/// coupling to this class. Attach to a persistent GameObject (e.g., GameManager).
/// All mutation goes through Add/RemoveItem to keep the event contract intact.
/// </summary>

using System;
using System.Collections.Generic;
using Herbalis.Data;
using UnityEngine;

namespace Herbalis.Core
{
    public class InventorySystem : MonoBehaviour
    {
        // Raised whenever any stack count changes. Subscribers receive the changed item and new count.
        public event Action<ItemSO, int> OnInventoryChanged;

        private readonly Dictionary<ItemSO, int> _items = new();

        /// <summary>Adds <paramref name="amount"/> units of <paramref name="item"/>. Amount must be positive.</summary>
        public void AddItem(ItemSO item, int amount = 1)
        {
            if (item == null || amount <= 0) return;

            _items.TryGetValue(item, out int current);
            _items[item] = current + amount;
            OnInventoryChanged?.Invoke(item, _items[item]);
        }

        /// <summary>
        /// Removes <paramref name="amount"/> units. Does nothing and returns false if insufficient stock.
        /// </summary>
        public bool RemoveItem(ItemSO item, int amount = 1)
        {
            if (item == null || amount <= 0) return false;
            if (!_items.TryGetValue(item, out int current) || current < amount) return false;

            int remaining = current - amount;
            if (remaining == 0)
                _items.Remove(item);
            else
                _items[item] = remaining;

            OnInventoryChanged?.Invoke(item, remaining);
            return true;
        }

        /// <summary>Returns true when the inventory contains at least <paramref name="amount"/> of <paramref name="item"/>.</summary>
        public bool HasItem(ItemSO item, int amount = 1)
        {
            if (item == null || amount <= 0) return false;
            return _items.TryGetValue(item, out int current) && current >= amount;
        }

        /// <summary>Returns current stack count, or 0 if not present.</summary>
        public int GetCount(ItemSO item)
        {
            if (item == null) return 0;
            _items.TryGetValue(item, out int count);
            return count;
        }

        /// <summary>Read-only snapshot of the full inventory for UI rendering.</summary>
        public IReadOnlyDictionary<ItemSO, int> GetAll() => _items;
    }
}
