/// <summary>
/// Placed in the world (via prefab on a Tilemap layer) to represent a harvestable resource.
/// Runs a three-state machine: Available → Harvested → Respawning → Available.
/// CharacterController2D calls TryHarvest() when the player's interact radius overlaps this collider.
/// Visual feedback (scale tween) is self-contained so the class has no UI dependencies.
/// </summary>

using System.Collections;
using Herbalis.Data;
using UnityEngine;

namespace Herbalis.Core
{
    public enum HarvestState { Available, Harvested, Respawning }

    [RequireComponent(typeof(Collider2D))]
    public class HarvestableObject : MonoBehaviour
    {
        [Header("Data")]
        [SerializeField] private ItemSO item;
        [SerializeField] private int harvestAmount = 1;

        [Header("Timing")]
        [SerializeField] private float respawnSeconds = 30f;

        [Header("Animation")]
        [SerializeField] private float harvestShrinkDuration = 0.2f;
        [SerializeField] private float respawnGrowDuration = 0.4f;

        public HarvestState State { get; private set; } = HarvestState.Available;

        private Vector3 _originalScale;
        private Collider2D _col;

        private void Awake()
        {
            _originalScale = transform.localScale;
            _col = GetComponent<Collider2D>();
        }

        /// <summary>
        /// Called by CharacterController2D. Returns harvested ItemSO (and amount) via out params.
        /// Returns false when not in Available state.
        /// </summary>
        public bool TryHarvest(out ItemSO harvestedItem, out int amount)
        {
            harvestedItem = item;
            amount = harvestAmount;

            if (State != HarvestState.Available) return false;

            OnHarvested();
            return true;
        }

        private void OnHarvested()
        {
            State = HarvestState.Harvested;
            _col.enabled = false;
            StartCoroutine(ShrinkThenRespawn());
        }

        private IEnumerator ShrinkThenRespawn()
        {
            yield return ScaleTo(Vector3.zero, harvestShrinkDuration);

            State = HarvestState.Respawning;

            yield return new WaitForSeconds(respawnSeconds);

            yield return ScaleTo(_originalScale, respawnGrowDuration);

            _col.enabled = true;
            State = HarvestState.Available;
        }

        private IEnumerator ScaleTo(Vector3 target, float duration)
        {
            Vector3 start = transform.localScale;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                transform.localScale = Vector3.Lerp(start, target, elapsed / duration);
                yield return null;
            }
            transform.localScale = target;
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.green;
            Gizmos.DrawWireSphere(transform.position, 0.5f);
        }
#endif
    }
}
